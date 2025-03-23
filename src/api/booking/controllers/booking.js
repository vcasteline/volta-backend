// @ts-nocheck
"use strict";

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::booking.booking", ({ strapi }) => ({
  async create(ctx) {
    // Extraer datos de la solicitud
    const { data } = ctx.request.body;
    const { bicycles, fechaHora, class: classId } = data;

    // Verificar si alguna de las bicicletas ya está reservada
    for (const bicycleId of bicycles) {
      const existingBookings = await strapi.entityService.findMany("api::booking.booking", {
        filters: {
          fechaHora: fechaHora,
          bicycles: {
            id: bicycleId
          },
          bookingStatus: {
            $in: ["completed"]  // Solo considerar reservas activas o reembolsadas
          }
        },
      });

      if (existingBookings.length > 0) {
        return ctx.badRequest(
          'Bicycle already booked',
          { message: `La bicicleta ${bicycleId} ya está reservada para esta clase.` }
        );
      }
    }

    // Si no hay conflictos, proceder con la creación
    const response = await super.create(ctx);
    return response;
  },

  async update(ctx) {
    // Similar validación para actualizaciones
    const { id } = ctx.params;
    const { data } = ctx.request.body;
    const { bicycles, fechaHora } = data;

    if (bicycles) {
      for (const bicycleId of bicycles) {
        const existingBookings = await strapi.entityService.findMany("api::booking.booking", {
          filters: {
            id: {
              $ne: id  // Excluir la reserva actual
            },
            fechaHora: fechaHora,
            bicycles: {
              id: bicycleId
            },
            bookingStatus: {
              $in: ["completed"]  // Solo considerar reservas activas o reembolsadas
            }
          },
        });

        if (existingBookings.length > 0) {
          return ctx.badRequest(
            'Bicycle already booked',
            { message: `La bicicleta ${bicycleId} ya está reservada para esta clase.` }
          );
        }
      }
    }

    const response = await super.update(ctx);
    return response;
  },

  // Método mejorado para manejar todo el proceso de reserva de forma atómica
  async reserveAndUpdateCredits(ctx) {
    try {
      const { data } = ctx.request.body;
      const { userId, bicycles, fechaHora, classId } = data;
      
      // Verificar que existan todos los datos necesarios
      if (!userId || !bicycles || !bicycles.length || !fechaHora || !classId) {
        return ctx.badRequest(
          'Datos incompletos',
          { message: 'Faltan datos requeridos para la reserva.' }
        );
      }

      // Acceso directo a Knex
      const knex = strapi.db.connection;

      // 1. Verificar si el usuario ya tiene una reserva para esta clase
      const existingUserBookings = await knex('bookings')
        .join('bookings_user_links', 'bookings.id', 'bookings_user_links.booking_id')
        .join('bookings_class_links', 'bookings.id', 'bookings_class_links.booking_id')
        .where({
          'bookings_user_links.user_id': userId,
          'bookings_class_links.class_id': classId,
          'bookings.fecha_hora': fechaHora,
        })
        .whereIn('bookings.booking_status', ['completed'])
        .select('bookings.id');

      if (existingUserBookings.length > 0) {
        return ctx.badRequest(
          'Reserva duplicada',
          { message: 'Ya tienes una reserva para esta clase.' }
        );
      }

      // 2. Verificar si el usuario existe
      const [user] = await knex('up_users')
        .where({ id: userId })
        .select('clases_disponibles');
      
      if (!user) {
        return ctx.badRequest(
          'Usuario no encontrado',
          { message: 'No se encontró el usuario especificado.' }
        );
      }

      // 3. Obtener los paquetes de clases no expirados del usuario
      const ahora = new Date();
      const paquetes = await knex('purchased_ride_packs')
        .join('purchased_ride_packs_user_links', 'purchased_ride_packs.id', 'purchased_ride_packs_user_links.purchased_ride_pack_id')
        .where('purchased_ride_packs_user_links.user_id', userId)
        .where('purchased_ride_packs.fecha_expiracion', '>', ahora)
        .orderBy('purchased_ride_packs.fecha_expiracion', 'asc')
        .select('purchased_ride_packs.*');
      
      // 4. Calcular créditos disponibles
      const creditosNecesarios = bicycles.length;
      const creditosDisponiblesPorPaquete = paquetes.map(paquete => ({
        id: paquete.id,
        disponibles: paquete.clases_originales - paquete.clases_utilizadas
      }));
      
      const creditosDisponiblesTotales = creditosDisponiblesPorPaquete.reduce(
        (total, paquete) => total + paquete.disponibles, 0
      );
      
      if (creditosDisponiblesTotales < creditosNecesarios) {
        return ctx.badRequest(
          'Créditos insuficientes',
          { 
            message: 'No tienes suficientes créditos para esta reserva.', 
            requiredCredits: creditosNecesarios,
            availableCredits: creditosDisponiblesTotales
          }
        );
      }
      
      // Asegurarnos de que bicycles sea un array de números
      const bicyclesNumeros = bicycles.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
      console.log('Bicicletas convertidas a números:', bicyclesNumeros);
      
      // 5. Verificar si alguna bicicleta ya está reservada
      console.log('Verificando bicicletas:', bicyclesNumeros, 'para clase:', classId, 'en fecha/hora:', fechaHora);
      
      // Convertir la fecha a timestamp si es necesario
      let fechaHoraParam = fechaHora;
      if (typeof fechaHora === 'string') {
        // Si es una cadena ISO, convertirla a timestamp
        const fechaObj = new Date(fechaHora);
        if (!isNaN(fechaObj.getTime())) {
          fechaHoraParam = fechaObj.getTime();
        }
      }      
      // Consulta para verificar si alguna de las bicicletas solicitadas ya está reservada
      const queryBicicletasReservadas = knex('bookings')
        .join('bookings_bicycles_links', 'bookings.id', 'bookings_bicycles_links.booking_id')
        .whereIn('bookings_bicycles_links.bicycle_id', bicyclesNumeros)
        .where(function() {
          this.where('bookings.fecha_hora', fechaHora)
              .orWhere('bookings.fecha_hora', fechaHoraParam);
        })
        .where('bookings.booking_status', 'completed')
        .select('bookings_bicycles_links.bicycle_id', 'bookings.fecha_hora', 'bookings.booking_status');
      
      const bicicletasYaReservadas = await queryBicicletasReservadas;       
      
      if (bicicletasYaReservadas.length > 0) {
        const idsReservados = bicicletasYaReservadas.map(b => parseInt(b.bicycle_id, 10));
        
        // Estructura de respuesta mejorada para facilitar el procesamiento en el frontend
        const errorResponse = {
          error: 'BICIS_RESERVADAS',
          name: 'Bicicletas ya reservadas',
          message: `Las siguientes bicicletas ya están reservadas: ${idsReservados.join(', ')}`,
          bicicletasReservadas: idsReservados,
          details: {
            bicicletasReservadas: idsReservados,
            error: 'BICIS_RESERVADAS'
          },
          data: {
            bicicletasReservadas: idsReservados
          }
        };
        
        return ctx.badRequest(
          'Bicicletas ya reservadas',
          errorResponse
        );
      }

      // Iniciar transacción con Knex
      const trx = await knex.transaction();
      
      try {
        // 6. Crear la reserva
        const [booking] = await trx('bookings')
          .insert({
            booking_status: 'completed',
            fecha_hora: fechaHora,
            created_at: new Date(),
            updated_at: new Date(),
            published_at: new Date()
          })
          .returning('*');
        
        // 6.1 Crear relación con usuario
        await trx('bookings_user_links')
          .insert({
            booking_id: booking.id,
            user_id: userId
          });
        
        // 6.2 Crear relación con clase
        await trx('bookings_class_links')
          .insert({
            booking_id: booking.id,
            class_id: classId
          });
        
        // 6.3 Crear relaciones con bicicletas
        for (let i = 0; i < bicycles.length; i++) {
          await trx('bookings_bicycles_links')
            .insert({
              booking_id: booking.id,
              bicycle_id: bicycles[i],
              bicycle_order: i + 1
            });
        }

        // 7. Actualizar los créditos en los paquetes (primero los que expiran antes)
        let creditosRestantes = creditosNecesarios;
        const paquetesActualizados = [];
        
        for (const paquete of paquetes) {
          if (creditosRestantes <= 0) break;
          
          const creditosDisponiblesEnPaquete = paquete.clases_originales - paquete.clases_utilizadas;
          
          if (creditosDisponiblesEnPaquete > 0) {
            const creditosAUsar = Math.min(creditosDisponiblesEnPaquete, creditosRestantes);
            
            const [paqueteActualizado] = await trx('purchased_ride_packs')
              .where({ id: paquete.id })
              .update({
                clases_utilizadas: paquete.clases_utilizadas + creditosAUsar,
                updated_at: new Date()
              })
              .returning('*');
            
            paquetesActualizados.push(paqueteActualizado);
            creditosRestantes -= creditosAUsar;
          }
        }
        
        // 8. Actualizar el contador global de clases disponibles del usuario
        const [updatedUser] = await trx('up_users')
          .where({ id: userId })
          .update({
            clases_disponibles: user.clases_disponibles - creditosNecesarios,
            updated_at: new Date()
          })
          .returning('*');
        
        // Commit de la transacción
        await trx.commit();
        
        // 9. Obtener datos completos para la respuesta
        const bookingCompleto = await knex('bookings')
          .where({ id: booking.id })
          .first();
          
        // Obtener bicicletas relacionadas
        const bicicletasRelacionadas = await knex('bicycles')
          .join('bookings_bicycles_links', 'bicycles.id', 'bookings_bicycles_links.bicycle_id')
          .where('bookings_bicycles_links.booking_id', booking.id)
          .select('bicycles.*');
          
        // Obtener clase relacionada
        const [claseRelacionada] = await knex('classes')
          .join('bookings_class_links', 'classes.id', 'bookings_class_links.class_id')
          .where('bookings_class_links.booking_id', booking.id)
          .select('classes.*');

        // Obtener instructor relacionado con la clase
        if (claseRelacionada) {
          const instructorInfo = await knex('instructors')
            .join('classes_instructor_links', 'instructors.id', 'classes_instructor_links.instructor_id')
            .where('classes_instructor_links.class_id', claseRelacionada.id)
            .select('instructors.*')
            .first();
          
          if (instructorInfo) {
            claseRelacionada.instructor = instructorInfo;
          }
        }
        
        // Enviar correo electrónico de confirmación de reserva
        try {
          // Obtener datos completos del usuario
          const userCompleto = await knex('up_users')
            .where({ id: userId })
            .first();

          await strapi.service('api::resend.resend').enviarConfirmacionReserva({
            user: userCompleto,
            booking: bookingCompleto,
            clase: claseRelacionada,
            bicycles: bicicletasRelacionadas
          });
          
          strapi.log.info(`Correo de confirmación de reserva enviado al usuario ${userId}`);
        } catch (emailError) {
          strapi.log.error("Error al enviar el correo electrónico de confirmación de reserva:", emailError);
          // No interrumpimos el flujo si falla el envío del correo
        }
        
        return {
          booking: {
            ...bookingCompleto,
            bicycles: bicicletasRelacionadas,
            class: claseRelacionada
          },
          user: {
            id: updatedUser.id,
            clasesDisponibles: updatedUser.clases_disponibles
          },
          paquetesActualizados
        };
        
      } catch (error) {
        // Rollback automático de la transacción
        await trx.rollback();
        console.error('Error durante la reserva:', error);
        
        return ctx.badRequest(
          'Error en reserva',
          { message: error.message || 'Ocurrió un error al procesar la reserva.' }
        );
      }
    } catch (error) {
      console.error('Error general:', error);
      return ctx.badRequest(
        'Error del servidor',
        { message: error.message || 'Ocurrió un error inesperado.' }
      );
    }
  },

  // Método para cancelar una reserva y devolver créditos
  async cancelAndRefundCredits(ctx) {
    try {
      const { id } = ctx.params;
      
      if (!id) {
        return ctx.badRequest(
          'Datos incompletos',
          { message: 'ID de reserva no proporcionado.' }
        );
      }

      // 1. Verificar que la reserva exista y obtener sus detalles
      const booking = await strapi.entityService.findOne('api::booking.booking', id, {
        populate: ['bicycles', 'user']
      });
      
      if (!booking) {
        return ctx.badRequest(
          'Reserva no encontrada',
          { message: 'No se encontró la reserva especificada.' }
        );
      }
      
      // 2. Verificar que la reserva no esté ya cancelada
      if (booking.bookingStatus === 'cancelled' || booking.bookingStatus === 'failed') {
        return ctx.badRequest(
          'Reserva no cancelable',
          { message: `Esta reserva ya tiene el estado "${booking.bookingStatus}" y no puede ser cancelada.` }
        );
      }
      
      // 3. Verificar el tiempo para cancelar
      const fechaReserva = new Date(booking.fechaHora);
      const ahora = new Date();
      const horasParaClase = (fechaReserva.getTime() - ahora.getTime()) / (1000 * 60 * 60);
      
      if (horasParaClase < 2) {
        return ctx.badRequest(
          'Cancelación fuera de tiempo',
          { message: 'No es posible cancelar con menos de 2 horas de antelación.' }
        );
      }

      const knex = strapi.db.connection;
      const trx = await knex.transaction();

      try {
        const userId = booking.user.id;
        const creditosADevolver = booking.bicycles?.length || 0;
        
        if (creditosADevolver <= 0) {
          await trx.commit();
          return { 
            success: true, 
            message: 'Reserva cancelada con éxito, no se detectaron créditos para devolver.' 
          };
        }

        // 4. Marcar la reserva como cancelada
        const [updatedBooking] = await trx('bookings')
          .where({ id })
          .update({
            booking_status: 'cancelled',
            published_at: new Date()
          })
          .returning('*');

        // 5. Obtener los paquetes del usuario
        const paquetes = await trx('purchased_ride_packs')
          .join('purchased_ride_packs_user_links', 'purchased_ride_packs.id', 'purchased_ride_packs_user_links.purchased_ride_pack_id')
          .where('purchased_ride_packs_user_links.user_id', userId)
          .orderBy('purchased_ride_packs.fecha_expiracion', 'desc')
          .select('purchased_ride_packs.*');

        // 6. Determinar y devolver créditos
        let creditosDevueltos = 0;
        const paquetesActualizados = [];
        
        for (const paquete of paquetes) {
          if (creditosDevueltos >= creditosADevolver) break;
          
          const fechaExpiracion = new Date(paquete.fecha_expiracion);
          
          if (fechaExpiracion > ahora) {
            const creditosUsadosEnPaquete = paquete.clases_utilizadas;
            const creditosPorDevolver = Math.min(
              creditosADevolver - creditosDevueltos,
              creditosUsadosEnPaquete
            );
            
            if (creditosPorDevolver > 0) {
              const [paqueteActualizado] = await trx('purchased_ride_packs')
                .where({ id: paquete.id })
                .update({
                  clases_utilizadas: paquete.clases_utilizadas - creditosPorDevolver
                })
                .returning('*');
              
              paquetesActualizados.push(paqueteActualizado);
              creditosDevueltos += creditosPorDevolver;
            }
          }
        }
        
        // 7. Actualizar clasesDisponibles del usuario
        const [user] = await trx('up_users')
          .where({ id: userId })
          .select('clases_disponibles');

        const [updatedUser] = await trx('up_users')
          .where({ id: userId })
          .update({
            clases_disponibles: (user.clases_disponibles || 0) + creditosDevueltos
          })
          .returning('*');

        // 8. Generar mensaje apropiado según resultado
        let message = '';
        if (creditosDevueltos === 0) {
          message = 'Reserva cancelada pero no se pudieron devolver los créditos porque los paquetes han expirado o ya no están disponibles.';
        } else if (creditosDevueltos < creditosADevolver) {
          message = `Reserva cancelada. Se devolvieron ${creditosDevueltos} de ${creditosADevolver} créditos. Los ${creditosADevolver - creditosDevueltos} créditos restantes no pudieron ser devueltos porque los paquetes correspondientes han expirado o ya no están disponibles.`;
        } else {
          message = `Reserva cancelada con éxito. Se devolvieron todos los créditos (${creditosDevueltos}).`;
        }

        // Commit de la transacción
        await trx.commit();
        
        return {
          success: true,
          message,
          booking: updatedBooking,
          creditosDevueltos,
          creditosNoDevueltos: creditosADevolver - creditosDevueltos,
          user: {
            id: updatedUser.id,
            clasesDisponibles: updatedUser.clases_disponibles
          },
          paquetesActualizados
        };
        
      } catch (error) {
        // Rollback automático de la transacción
        await trx.rollback();
        console.error('Error durante la cancelación:', error);
        
        return ctx.badRequest(
          'Error en cancelación',
          { message: error.message || 'Ocurrió un error al procesar la cancelación.' }
        );
      }
    } catch (error) {
      return ctx.badRequest(
        'Error del servidor',
        { message: error.message || 'Ocurrió un error inesperado.' }
      );
    }
  }
}));
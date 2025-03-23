'use strict';

/**
 * purchased-ride-pack controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::purchased-ride-pack.purchased-ride-pack', ({ strapi }) => ({
  async create(ctx) {
    const response = await super.create(ctx);
    
    const convertDate = (date) => {
      const options = {
        month: "short",
        day: "numeric",
      };
      return new Date(date).toLocaleDateString("en-US", options);
    };

    try {
      const purchaseId = response.data.id;
      const purchase = await strapi.entityService.findOne(
        "api::purchased-ride-pack.purchased-ride-pack",
        purchaseId,
        {
          populate: ["user"],
        }
      );

      await strapi
        .plugin("email-designer")
        .service("email")
        .sendTemplatedEmail(
          {
            to: purchase.user.email,
          },
          {
            templateReferenceId: 4,
          },
          {
            nombre: `${purchase.user.nombre}`,
            cantidadClases: purchase.clasesOriginales,
            fechaCompra: convertDate(purchase.fechaCompra),
            fechaExpiracion: convertDate(purchase.fechaExpiracion),
            transactionId: purchase.transactionId,
            authorizationCode: purchase.authorizationCode,
          }
        );
    } catch (err) {
      console.error("Error al enviar el correo electrónico:", err);
    }

    return response;
  },

  // Método para comprar paquete y actualizar créditos del usuario en una transacción atómica
  async comprarPaqueteConTransaccion(ctx) {
    try {
      const { data } = ctx.request.body;
      const { 
        userId, 
        numeroDeClases, 
        diasDuracion, 
        transactionId, 
        authorizationCode, 
        valor,
        tipo 
      } = data;
      
      // Verificar que existan todos los datos necesarios
      if (!userId || !numeroDeClases) {
        return ctx.badRequest(
          'Datos incompletos',
          { message: 'Faltan datos requeridos para la compra del paquete.' }
        );
      }

      // Acceso directo a Knex
      const knex = strapi.db.connection;

      // 1. Verificar si el usuario existe
      const [user] = await knex('up_users')
        .where({ id: userId })
        .select('clases_disponibles', 'email', 'nombre');
      
      if (!user) {
        return ctx.badRequest(
          'Usuario no encontrado',
          { message: 'No se encontró el usuario especificado.' }
        );
      }

      // 2. Calcular fechas de compra y expiración
      const fechaCompra = new Date();
      let fechaExpiracion;
      
      if (diasDuracion === 1) {
        // Si la duración es 1, establecer la fecha de expiración al final del mes actual
        fechaExpiracion = new Date(fechaCompra.getFullYear(), fechaCompra.getMonth() + 1, 0, 23, 59, 59, 999);
      } else {
        // Calcular fecha de expiración según los días de duración
        fechaExpiracion = new Date(fechaCompra);
        fechaExpiracion.setDate(fechaExpiracion.getDate() + diasDuracion);
      }

      // 3. Iniciar transacción con Knex
      const trx = await knex.transaction();
      
      try {
        // 4. Crear el paquete de clases
        const [paquete] = await trx('purchased_ride_packs')
          .insert({
            clases_originales: numeroDeClases,
            clases_utilizadas: 0,
            fecha_compra: fechaCompra.toISOString(),
            fecha_expiracion: fechaExpiracion.toISOString(),
            contabilizado: false,
            transaction_id: transactionId,
            authorization_code: authorizationCode,
            valor: valor,
            tipo: tipo,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            published_at: new Date().toISOString()
          })
          .returning('*');
        
        // 4.1 Crear relación con usuario
        await trx('purchased_ride_packs_user_links')
          .insert({
            purchased_ride_pack_id: paquete.id,
            user_id: userId
          });
        
        // 5. Actualizar el contador global de clases disponibles del usuario
        const clasesDisponiblesActuales = user.clases_disponibles || 0;
        const [updatedUser] = await trx('up_users')
          .where({ id: userId })
          .update({
            clases_disponibles: clasesDisponiblesActuales + numeroDeClases,
            updated_at: new Date().toISOString()
          })
          .returning('*');
        
        // 6. Commit de la transacción
        await trx.commit();
        
        // 7. Enviar correo electrónico de confirmación usando Resend
        try {
          await strapi.service('api::resend.resend').enviarConfirmacionCompra({
            user: {
              ...user,
              id: userId
            },
            paquete: {
              ...paquete,
              clasesOriginales: numeroDeClases,
              fechaCompra: fechaCompra.toISOString(),
              fechaExpiracion: fechaExpiracion.toISOString(),
              transactionId,
              authorizationCode
            }
          });
          strapi.log.info(`Correo de confirmación de compra enviado al usuario ${userId}`);
        } catch (emailError) {
          strapi.log.error("Error al enviar el correo electrónico de confirmación:", emailError);
          // No interrumpimos el flujo si falla el envío del correo
        }
        
        // 8. Retornar respuesta con los datos actualizados
        return {
          paquete: {
            id: paquete.id,
            clasesOriginales: numeroDeClases,
            clasesUtilizadas: 0,
            clasesDisponibles: numeroDeClases,
            fechaCompra: fechaCompra.toISOString(),
            fechaExpiracion: fechaExpiracion.toISOString(),
            transactionId: transactionId,
            authorizationCode: authorizationCode,
            valor: valor,
            tipo: tipo
          },
          user: {
            id: updatedUser.id,
            clasesDisponibles: updatedUser.clases_disponibles
          }
        };
        
      } catch (error) {
        // Rollback automático de la transacción en caso de error
        await trx.rollback();
        console.error('Error durante la compra del paquete:', error);
        
        return ctx.badRequest(
          'Error en compra',
          { message: error.message || 'Ocurrió un error al procesar la compra del paquete.' }
        );
      }
    } catch (error) {
      console.error('Error general:', error);
      return ctx.badRequest(
        'Error del servidor',
        { message: error.message || 'Ocurrió un error inesperado.' }
      );
    }
  }
}));

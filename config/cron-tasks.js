module.exports = {
  moveBookingsIntoOldBookingsTable: {
    task: async ({ strapi }) => {
      try {
        // Obtener fecha actual en Ecuador
        const now = new Date();
        
        const cutoffTime = new Date(now.getTime() - (90 * 60 * 1000)); // 90 minutos = 1.5 horas
        // Logs para monitoreo
        console.log('=== INICIO CRON MOVE BOOKINGS ===');
        console.log('Hora actual Ecuador:', now.toLocaleString('es-EC', { timeZone: 'America/Guayaquil' }));
        console.log('Hora límite para bookings:', cutoffTime.toLocaleString('es-EC', { timeZone: 'America/Guayaquil' }));

        const bookingsToMove = await strapi.entityService.findMany("api::booking.booking", {
          filters: {
            $and: [
              { bookingStatus: { $eq: "completed" } },
              { fechaHora: { $lt: cutoffTime.toISOString() } }
            ]
          },
          populate: ["class", "class.instructor", "bicycles", "user", "guest"],
        });

        console.log(`Encontrados ${bookingsToMove.length} bookings para mover`);

        for (const booking of bookingsToMove) {
          try {
            // Verificar si ya existe en past-booking
            const existingPastBooking = await strapi.entityService.findMany("api::past-booking.past-booking", {
              filters: {
                fechaHora: booking.fechaHora,
                users_permissions_user: booking.user.id
              },
              limit: 1
            });

            if (existingPastBooking.length > 0) {
              console.log(`Booking ${booking.id} ya existe en past-bookings. Saltando.`);
              continue;
            }

            // Crear copias de los datos
            const classData = {
              nombreClase: booking.class.nombreClase || `Rueda con ${booking.class.instructor.nombreCompleto}`,
              horaInicio: booking.class.horaInicio,
              horaFin: booking.class.horaFin,
              instructor: {
                nombreCompleto: booking.class.instructor.nombreCompleto,
                email: booking.class.instructor.email
              }
            };

            const bicyclesData = booking.bicycles.map(bike => ({
              bicycleNumber: bike.bicycleNumber
            }));

            // Crear past-booking
            await strapi.entityService.create("api::past-booking.past-booking", {
              data: {
                bookingStatus: booking.bookingStatus,
                classData,
                bicyclesData,
                users_permissions_user: booking.user,
                fechaHora: booking.fechaHora,
                guest: booking.guest,
                publishedAt: new Date()
              },
            });

            // Eliminar booking original
            await strapi.entityService.delete("api::booking.booking", booking.id);

            console.log(`Booking ${booking.id} movido exitosamente a past-bookings`);
          } catch (error) {
            console.error(`Error procesando booking ${booking.id}:`, error);
          }
        }

        console.log('=== FIN CRON MOVE BOOKINGS ===');
      } catch (error) {
        console.error('Error en cron moveBookingsIntoOldBookingsTable:', error);
      }
    },
    options: {
      rule: '0 * * * *', // Ejecutar cada hora en el minuto 0
    },
  },
  actualizarClasesPorExpiracion: {
    task: async ({ strapi }) => {
      try {
        const ahora = new Date();
        console.log('=== INICIO DE CRON DE EXPIRACIÓN ===');
        console.log(`Ejecutando verificación a las ${ahora.toISOString()}`);

        // Buscar TODOS los paquetes expirados y no contabilizados
        const paquetesExpirados = await strapi.entityService.findMany('api::purchased-ride-pack.purchased-ride-pack', {
          filters: {
            fechaExpiracion: { $lt: ahora }, // Todos los que ya expiraron (antes de ahora)
            contabilizado: false             // Y no han sido procesados
          },
          populate: ['user']
        });

        console.log(`Encontrados ${paquetesExpirados.length} paquetes expirados`);

        for (const paquete of paquetesExpirados) {
          try {
            // Verificar si el paquete tiene usuario
            if (!paquete.user) {
              console.log(`Paquete ${paquete.id} no tiene usuario asociado. Marcando como contabilizado.`);
              await strapi.entityService.update('api::purchased-ride-pack.purchased-ride-pack', paquete.id, {
                data: { contabilizado: true }
              });
              continue;
            }

            const clasesNoUtilizadas = paquete.clasesOriginales - paquete.clasesUtilizadas;
            const usuario = paquete.user;
            
            // Verificar que clasesDisponibles sea un número
            if (typeof usuario.clasesDisponibles !== 'number') {
              usuario.clasesDisponibles = 0;
            }

            const nuevasClasesDisponibles = Math.max(usuario.clasesDisponibles - clasesNoUtilizadas, 0);
            
            await strapi.entityService.update('plugin::users-permissions.user', usuario.id, {
              data: { clasesDisponibles: nuevasClasesDisponibles }
            });

            await strapi.entityService.update('api::purchased-ride-pack.purchased-ride-pack', paquete.id, {
              data: { contabilizado: true }
            });

            console.log(`Paquete ${paquete.id} expirado el ${paquete.fechaExpiracion}. Usuario ${usuario.id}: ${clasesNoUtilizadas} clases restadas. Nuevas clases disponibles: ${nuevasClasesDisponibles}`);
          } catch (error) {
            console.error(`Error procesando paquete ${paquete.id}:`, error);
          }
        }

        console.log('Actualización de clases por expiración completada');
      } catch (error) {
        console.error('ERROR EN CRON DE EXPIRACIÓN:', error);
      }
    },
    options: {
      rule: '1 0 * * *', // 12:01 AM hora Ecuador
    },
  }
};

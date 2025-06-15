const { DateTime } = require("luxon");

module.exports = {
  moveBookingsIntoOldBookingsTable: {
    task: async ({ strapi }) => {
      try {
        // Obtener fecha y hora actual en Ecuador
        const ahoraEcuador = DateTime.now().setZone("America/Guayaquil");
        
        // *** QUICK FIX: No ejecutar los domingos >= 12:00 PM Ecuador ***
        const currentWeekday = ahoraEcuador.weekday; // 1 (Mon) - 7 (Sun)
        const currentHour = ahoraEcuador.hour; // 0 - 23
        if (currentWeekday === 7 && currentHour >= 12) {
          console.log('=== CRON MOVE BOOKINGS SKIPPED (Domingo >= 12:00 PM Ecuador) ===');
          return; // Salir de la tarea
        }
        // *** FIN QUICK FIX ***
        
        const diaSemanaActual = ahoraEcuador.setLocale('es').weekdayLong; // e.g., 'Lunes', 'Martes' etc.
        const horaActual = ahoraEcuador;

        // Logs para monitoreo
        console.log('=== INICIO CRON MOVE BOOKINGS ===');
        console.log('Hora actual Ecuador:', ahoraEcuador.toISO());
        console.log('Día semana Ecuador:', diaSemanaActual);

        // Buscar bookings completados y poblar la clase asociada
        const bookingsPorRevisar = await strapi.entityService.findMany("api::booking.booking", {
          filters: {
            bookingStatus: { $in: ["completed", "cancelled"] }
          },
          populate: { 
            class: { 
              populate: { instructor: true } 
            },
            bicycles: true,
            user: true,
            guest: true
          },
        });

        console.log(`Encontrados ${bookingsPorRevisar.length} bookings para revisar`);

        for (const booking of bookingsPorRevisar) {
          try {
            // Validar que el booking tenga clase y datos necesarios
            if (!booking.class || !booking.class.diaDeLaSemana || !booking.class.horaFin || !booking.user) {
              console.log(`Booking ${booking.id} saltado por falta de datos (clase, dia, horaFin o usuario).`);
              continue;
            }

            const diaClase = booking.class.diaDeLaSemana;
            const horaFinClaseStr = booking.class.horaFin; // formato HH:mm

            // Comparar si el día de la semana coincide
            if (diaClase.toLowerCase() === diaSemanaActual.toLowerCase()) {
              // Parsear la hora de finalización
              const [hFin, mFin] = horaFinClaseStr.split(':').map(Number);
              if (isNaN(hFin) || isNaN(mFin)) {
                console.log(`Booking ${booking.id} saltado, formato horaFin inválido: ${horaFinClaseStr}`);
                continue;
              }

              // Parsear la hora de inicio para usarla en past-booking
              const horaInicioClaseStr = booking.class.horaInicio; // formato HH:mm
              const [hInicio, mInicio] = horaInicioClaseStr.split(':').map(Number);
              if (isNaN(hInicio) || isNaN(mInicio)) {
                console.log(`Booking ${booking.id} saltado, formato horaInicio inválido: ${horaInicioClaseStr}`);
                continue;
              }

              // Crear fecha/hora de finalización para HOY en Ecuador (para la lógica de mover)
              let horaFinClaseHoy = ahoraEcuador.set({ hour: hFin, minute: mFin, second: 0, millisecond: 0 });
              
              // Crear fecha/hora REAL de inicio de la clase para guardar en past-booking
              const fechaHoraRealInicioClase = ahoraEcuador.set({ hour: hInicio, minute: mInicio, second: 0, millisecond: 0 });

              // Calcular la hora límite (hora fin + 1 hora)
              const horaLimiteParaMover = horaFinClaseHoy.plus({ hours: 1 });
              
              console.log(`Booking ${booking.id} - Clase ${booking.class.id} (${diaClase} ${horaFinClaseStr}). Hora límite: ${horaLimiteParaMover.toISO()}`);

              // Verificar si la hora actual ha superado la hora límite
              if (horaActual >= horaLimiteParaMover) {
                console.log(`Booking ${booking.id} cumple condición para moverse.`);
                
                // Si el booking está cancelado, simplemente eliminarlo
                if (booking.bookingStatus === 'cancelled') {
                  await strapi.entityService.delete("api::booking.booking", booking.id);
                  console.log(`Booking ${booking.id} con status 'cancelled' eliminado.`);
                } else {
                  // Crear copias de los datos para bookings completados
                  const classData = {
                    nombreClase: booking.class.nombreClase || `Rueda con ${booking.class.instructor?.nombreCompleto || 'Instructor desconocido'}`, // Añadido fallback
                    horaInicio: booking.class.horaInicio,
                    horaFin: booking.class.horaFin,
                    instructor: booking.class.instructor ? {
                      nombreCompleto: booking.class.instructor.nombreCompleto,
                      email: booking.class.instructor.email
                    } : null // Manejar instructor nulo
                  };

                  const bicyclesData = booking.bicycles.map(bike => ({ // Asegurarse que bicycles no sea null
                    bicycleNumber: bike.bicycleNumber
                  }));

                  // Crear past-booking SOLO para bookings completados
                  await strapi.entityService.create("api::past-booking.past-booking", {
                    data: {
                      bookingStatus: booking.bookingStatus,
                      classData,
                      bicyclesData,
                      users_permissions_user: booking.user,
                      publishedAt: new Date() // Usar ahora UTC
                    },
                  });

                  // Eliminar booking original
                  await strapi.entityService.delete("api::booking.booking", booking.id);

                  console.log(`Booking ${booking.id} movido exitosamente a past-bookings`);
                }
              } else {
                console.log(`Booking ${booking.id} aún no cumple la hora límite.`);
              }
            } else {
              console.log(`Booking ${booking.id} no es del día de hoy (${diaSemanaActual}). Clase es de ${diaClase}`);
            }
          } catch (error) {
            console.error(`Error procesando booking ${booking.id}:`, error.message, error.stack);
          }
        }

        console.log('=== FIN CRON MOVE BOOKINGS ===');
      } catch (error) {
        console.error('Error general en cron moveBookingsIntoOldBookingsTable:', error.message, error.stack);
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
      rule: '1 5 * * *', // 12:01 AM hora Ecuador (UTC-5)
    },
  }
};

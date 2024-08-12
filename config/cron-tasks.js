module.exports = {
  moveBookingsIntoOldBookingsTable: {
    task: async ({ strapi }) => {
      const currentDate = new Date();
      const cutoffDate = new Date(currentDate.getTime() - 90 * 60000); // 1 hora y 30 minutos antes
  
      const oldBookings = await strapi.entityService.findMany(
        "api::booking.booking",
        {
          filters: {
            fechaHora: {
              $lt: cutoffDate,
            },
            bookingStatus: "completed",
          },
          populate: ["class", "bicycles", "user", "guest"],
        }
      );
  
      let movedCount = 0;
      for (const oldBooking of oldBookings) {
        try {
          // Verificar si ya existe en past-booking
          const existingPastBooking = await strapi.entityService.findMany("api::past-booking.past-booking", {
            filters: {
              fechaHora: oldBooking.fechaHora,
              users_permissions_user: oldBooking.user.id,
              class: oldBooking.class.id
            },
            limit: 1
          });

          if (existingPastBooking.length > 0) {
            console.log(`Booking ${oldBooking.id} already exists in past-bookings. Skipping.`);
            continue; // Salta a la siguiente iteración del bucle
          }

          const pastBookingData = {
            bookingStatus: oldBooking.bookingStatus,
            class: oldBooking.class,
            bicycles: oldBooking.bicycles,
            users_permissions_user: oldBooking.user,
            fechaHora: oldBooking.fechaHora,
            guest: oldBooking.guest,
          };
  
          await strapi.entityService.create("api::past-booking.past-booking", {
            data: { ...pastBookingData, publishedAt: new Date() },
          });
  
          await strapi.entityService.delete(
            "api::booking.booking",
            oldBooking.id
          );
          
          movedCount++;
        } catch (error) {
          console.error(`Error processing booking ${oldBooking.id}:`, error);
        }
      }
  
      console.log(`Moved ${movedCount} completed bookings to pastBookings table`);
    },
    options: {
      rule: "*/15 * * * *", // Run every 15 minutes
    },
  },
  actualizarClasesPorExpiracion: {
    task: async ({ strapi }) => {
      const ahora = new Date();
      console.log(`Iniciando verificación de expiración a las ${ahora.toISOString()}`);

      // Calculamos la fecha de ayer al final del día
      const ayerFinalDelDia = new Date(ahora);
      ayerFinalDelDia.setDate(ayerFinalDelDia.getDate() - 1);
      ayerFinalDelDia.setHours(23, 59, 59, 999);

      const paquetesExpirados = await strapi.entityService.findMany('api::purchased-ride-pack.purchased-ride-pack', {
        filters: {
          fechaExpiracion: { $lte: ayerFinalDelDia },
          contabilizado: false
        },
        populate: ['user']
      });

      console.log(`Encontrados ${paquetesExpirados.length} paquetes expirados`);

      for (const paquete of paquetesExpirados) {
        const clasesNoUtilizadas = paquete.clasesOriginales - paquete.clasesUtilizadas;
        
        // Actualizar clasesDisponibles del usuario
        const usuario = paquete.user;
        const nuevasClasesDisponibles = Math.max(usuario.clasesDisponibles - clasesNoUtilizadas, 0);
        
        await strapi.entityService.update('plugin::users-permissions.user', usuario.id, {
          data: { clasesDisponibles: nuevasClasesDisponibles }
        });

        // Marcar paquete como contabilizado
        await strapi.entityService.update('api::purchased-ride-pack.purchased-ride-pack', paquete.id, {
          data: { contabilizado: true }
        });

        console.log(`Paquete ${paquete.id} expirado el ${new Date(paquete.fechaExpiracion).toISOString()}. Usuario ${usuario.id}: ${clasesNoUtilizadas} clases restadas. Nuevas clases disponibles: ${nuevasClasesDisponibles}`);
      }

      console.log('Actualización de clases por expiración completada');
    },
    options: {
      rule: '5 0 * * *', // Ejecutar todos los días a las 00:05 AM
    },
  }
};

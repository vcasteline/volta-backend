// @ts-nocheck
"use strict";

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::booking.booking", ({ strapi }) => ({
  async update(ctx) {
    const response = await super.update(ctx);
    const convertDate = (date) => {
      const options = {
        month: "short",
        day: "numeric",
      };
      return new Date(date).toLocaleDateString("en-US", options);
    };
    function redondearHora(hora) {
      const [horas, minutos] = hora.split(":");
      const minutosRedondeados = Math.round(Number(minutos) / 5) * 5;
      return `${horas}:${minutosRedondeados.toString().padStart(2, "0")}`;
    }
    
    const bookingId = ctx.params.id;
    const booking = await strapi.entityService.findOne(
      "api::booking.booking",
      bookingId,
      {
        populate: ["class", "class.instructor", "bicycles", "user", "guest"],
      }
    );
    console.log(booking);
    
    try {
      if (booking.bookingStatus === "completed") {
        // Obtén los números de bicicleta
        const bicycleNumbers = booking.bicycles.map(b => b.bicycleNumber).join(", ");
        
        await strapi
          .plugin("email-designer")
          .service("email")
          .sendTemplatedEmail(
            {
              to: booking.user.email,
            },
            {
              templateReferenceId: 1,
            },
            {
              class: booking.class.nombreClase,
              fechaHora:
                convertDate(booking.fechaHora) +
                " a las " +
                redondearHora(booking.class.horaInicio),
              bicycle: bicycleNumbers,
              instructor: booking.class.instructor.nombreCompleto,
            }
          );
      } else if (booking.bookingStatus === "refunded") {
        // Similar cambio para el email de reembolso
        const bicycleNumbers = booking.bicycles.map(b => b.bicycleNumber).join(", ");
        
        await strapi
          .plugin("email-designer")
          .service("email")
          .sendTemplatedEmail(
            {
              to: booking.user.email,
            },
            {
              templateReferenceId: 2,
            },
            {
              class: booking.class.nombreClase,
              fechaHora:
                convertDate(booking.fechaHora) +
                " a las " +
                redondearHora(booking.class.horaInicio),
              bicycle: bicycleNumbers,
              instructor: booking.class.instructor.nombreCompleto,
            }
          );
      }
  
      // Manejo del email para el invitado
      if (booking.guest) {
        const bicycleNumbers = booking.bicycles.map(b => b.bicycleNumber).join(", ");
        
        await strapi
          .plugin("email-designer")
          .service("email")
          .sendTemplatedEmail(
            {
              to: booking.guest.email,
            },
            {
              templateReferenceId: 3,
            },
            {
              class: booking.class.nombreClase,
              fechaHora:
                convertDate(booking.fechaHora) +
                " a las " +
                redondearHora(booking.class.horaInicio),
              bicycle: bicycleNumbers,
              instructor: booking.class.instructor.nombreCompleto,
              invitedBy: `${booking.user.nombre} ${booking.user.apellido}`,
            }
          );
      }
    } catch (err) {
      console.error("Error al enviar el correo electrónico:", err);
    }
  
    return response;
  }
}));
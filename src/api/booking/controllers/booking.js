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
      // @ts-ignore
      const formattedDate = new Date(date).toLocaleDateString("en-US", options);
      return formattedDate;
    };
    function redondearHora(hora) {
      const [horas, minutos] = hora.split(":");
      const minutosRedondeados = Math.round(Number(minutos) / 5) * 5;
      const nuevaHora = `${horas}:${minutosRedondeados
        .toString()
        .padStart(2, "0")}`;
      return nuevaHora;
    }
    // Obtén la información del booking actualizado
    const bookingId = ctx.params.id;
    const booking = await strapi.entityService.findOne(
      "api::booking.booking",
      bookingId,
      {
        // @ts-ignore
        populate: ["class", "class.instructor", "bicycles", "user"],
      }
    );
    console.log(booking);
    try {
      // Verifica el estado de la reserva (booking status)
      if (booking.bookingStatus === "completed") {
        // Envía el correo electrónico de confirmación cuando el estado es "completed"
        await strapi
          .plugin("email-designer")
          .service("email")
          .sendTemplatedEmail(
            {
              to: booking.user.email,
            },
            {
              templateReferenceId: 1, // ID de referencia de la plantilla de confirmación
              //subject: 'Confirmación de reserva',
            },
            {
              class: booking.class.nombreClase,
              fechaHora:
                convertDate(booking.fechaHora) +
                " a las " +
                redondearHora(booking.class.horaInicio),
              bicycle: booking.bicycle.bicycleNumber,
              instructor: booking.class.instructor.nombreCompleto,
            }
          );
      } else if (booking.bookingStatus === "refunded") {
        // Envía el correo electrónico de reembolso cuando el estado es "refunded"
        await strapi
          .plugin("email-designer")
          .service("email")
          .sendTemplatedEmail(
            {
              to: booking.user.email,
            },
            {
              templateReferenceId: 2, // ID de referencia de la plantilla de reembolso
              //subject: 'Reembolso de reserva',
            },
            {
              class: booking.class.nombreClase,
              fechaHora:
                convertDate(booking.fechaHora) +
                " a las " +
                redondearHora(booking.class.horaInicio),
              bicycle: booking.bicycle.bicycleNumber,
              instructor: booking.class.instructor.nombreCompleto,
            }
          );
      }
    } catch (err) {
      console.error("Error al enviar el correo electrónico:", err);
    }

    return response;
  },
}));

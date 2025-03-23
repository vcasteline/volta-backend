'use strict';

const { Resend } = require('resend');

/**
 * Servicio para enviar correos electrónicos usando Resend
 */
module.exports = {
  /**
   * Inicializar el cliente de Resend con la API key
   */
  getClient() {
    const { apiKey } = strapi.config.get('plugin.resend.config');
    if (!apiKey) {
      throw new Error('Resend API key no encontrada en la configuración');
    }
    return new Resend(apiKey);
  },

  /**
   * Enviar correo electrónico de confirmación de compra de paquete
   * @param {Object} options - Opciones para el correo
   * @param {Object} options.user - Datos del usuario
   * @param {Object} options.paquete - Datos del paquete comprado
   */
  async enviarConfirmacionCompra({ user, paquete }) {
    try {
      const resend = this.getClient();
      const { defaultFrom, defaultReplyTo } = strapi.config.get('plugin.resend.config');

      const formatDate = (date) => {
        const options = { day: '2-digit', month: 'short', year: 'numeric' };
        return new Date(date).toLocaleDateString('es-ES', options);
      };

      const result = await resend.emails.send({
        from: defaultFrom,
        to: user.email,
        subject: '¡Gracias por tu compra en Volta!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://voltaec.com/wp-content/uploads/2024/09/VOLTA-LOGO3.png" alt="Volta Logo" width="150" />
            </div>
            
            <h1 style="color: #3D4AF5; text-align: center; margin-bottom: 30px;">¡Gracias por tu compra!</h1>
            
            <div style="background-color: #f8f9fa; border-radius: 10px; padding: 20px; margin-bottom: 30px;">
              <h2 style="color: #3D4AF5; margin-top: 0;">Detalles de tu compra</h2>
              
              <div style="margin-bottom: 20px;">
                <p style="margin: 5px 0;"><strong>Nombre:</strong> ${user.nombre || 'Cliente'}</p>
                <p style="margin: 5px 0;"><strong>Fecha de compra:</strong> ${formatDate(paquete.fechaCompra)}</p>
                <p style="margin: 5px 0;"><strong>Cantidad de clases:</strong> ${paquete.clasesOriginales}</p>
                <p style="margin: 5px 0;"><strong>Fecha de expiración:</strong> ${formatDate(paquete.fechaExpiracion)}</p>
                ${paquete.transactionId ? `<p style="margin: 5px 0;"><strong>ID de transacción:</strong> ${paquete.transactionId}</p>` : ''}
                ${paquete.authorizationCode ? `<p style="margin: 5px 0;"><strong>Código de autorización:</strong> ${paquete.authorizationCode}</p>` : ''}
              </div>
            </div>
            
            <div style="background-color: #e8f4ff; border-radius: 10px; padding: 20px; margin-bottom: 30px;">
              <h2 style="color: #3D4AF5; margin-top: 0;">¿Cómo usar tus clases?</h2>
              <p>Tus ${paquete.clasesOriginales} clases ya están disponibles en tu cuenta. Para reservar:</p>
              <ol style="margin-top: 10px; padding-left: 20px;">
                <li>Ingresa a la app de Volta</li>
                <li>Selecciona la fecha y hora que prefieras</li>
                <li>Elige tu bicicleta favorita</li>
                <li>¡Listo! Te esperamos en clase</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin-top: 30px; color: #777; font-size: 14px;">
              <p>Si tienes alguna pregunta, contáctanos en <a href="mailto:hola@volta.com" style="color: #3D4AF5;">hola@volta.com</a></p>
              <p>&copy; ${new Date().getFullYear()} Volta. Todos los derechos reservados.</p>
            </div>
          </div>
        `,
      });

      strapi.log.info(`Correo de confirmación de compra enviado: ${result.id}`);
      return result;
    } catch (error) {
      strapi.log.error('Error al enviar correo de confirmación de compra:', error);
      throw error;
    }
  },

  /**
   * Enviar correo electrónico de confirmación de reserva
   * @param {Object} options - Opciones para el correo
   * @param {Object} options.user - Datos del usuario
   * @param {Object} options.booking - Datos de la reserva
   * @param {Object} options.clase - Datos de la clase
   * @param {Array} options.bicycles - Datos de las bicicletas reservadas
   */
  async enviarConfirmacionReserva({ user, booking, clase, bicycles }) {
    try {
      const resend = this.getClient();
      const { defaultFrom, defaultReplyTo } = strapi.config.get('plugin.resend.config');

      const formatDate = (date) => {
        const options = { day: '2-digit', month: 'short', year: 'numeric' };
        return new Date(date).toLocaleDateString('es-ES', options);
      };

      const formatTime = (date) => {
        const options = { hour: '2-digit', minute: '2-digit', hour12: true };
        return new Date(date).toLocaleTimeString('es-ES', options);
      };

      const bicyclesList = bicycles
        .map(bike => `Bicicleta #${bike.attributes?.bicycleNumber || bike.bicycleNumber || bike.id}`)
        .join('<br>');

      const result = await resend.emails.send({
        from: defaultFrom,
        to: user.email,
        subject: '¡Tu reserva en Volta está confirmada!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://your-app-url.com/logo.png" alt="Volta Logo" width="150" />
            </div>
            
            <h1 style="color: #3D4AF5; text-align: center; margin-bottom: 30px;">¡Tu reserva está confirmada!</h1>
            
            <div style="background-color: #f8f9fa; border-radius: 10px; padding: 20px; margin-bottom: 30px;">
              <h2 style="color: #3D4AF5; margin-top: 0;">Detalles de tu reserva</h2>
              
              <div style="margin-bottom: 20px;">
                <p style="margin: 5px 0;"><strong>Fecha:</strong> ${formatDate(booking.fechaHora)}</p>
                <p style="margin: 5px 0;"><strong>Hora:</strong> ${formatTime(booking.fechaHora)}</p>
                <p style="margin: 5px 0;"><strong>Instructor:</strong> ${clase.instructor?.attributes?.nombreCompleto || clase.instructor?.nombreCompleto || 'No especificado'}</p>
                <p style="margin: 5px 0;"><strong>Bicicletas reservadas:</strong><br>${bicyclesList}</p>
              </div>
            </div>
            
            <div style="background-color: #e8f4ff; border-radius: 10px; padding: 20px; margin-bottom: 30px;">
              <h2 style="color: #3D4AF5; margin-top: 0;">Recomendaciones</h2>
              <ul style="margin-top: 10px; padding-left: 20px;">
                <li>Llega 15 minutos antes de tu clase</li>
                <li>Trae una botella de agua</li>
                <li>Usa ropa cómoda</li>
                <li>Si necesitas cancelar, hazlo con al menos 2 horas de anticipación</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px; color: #777; font-size: 14px;">
              <p>Si tienes alguna pregunta, contáctanos en <a href="mailto:hola@volta.com" style="color: #3D4AF5;">hola@volta.com</a></p>
              <p>&copy; ${new Date().getFullYear()} Volta. Todos los derechos reservados.</p>
            </div>
          </div>
        `,
      });

      strapi.log.info(`Correo de confirmación de reserva enviado: ${result.id}`);
      return result;
    } catch (error) {
      strapi.log.error('Error al enviar correo de confirmación de reserva:', error);
      throw error;
    }
  }
}; 
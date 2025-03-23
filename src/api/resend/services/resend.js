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
    // Acceder a la configuración de Resend directamente desde el env
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      strapi.log.error('Resend API key no encontrada en .env (RESEND_API_KEY)');
      throw new Error('Resend API key no configurada');
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
      // Obtener valores desde las variables de entorno
      const emailFrom = process.env.RESEND_FROM_EMAIL || 'hola@volta.com';
      const defaultFrom = `Volta <${emailFrom}>`;
      const defaultReplyTo = process.env.RESEND_REPLY_TO || 'hola@volta.com';

      const formatDate = (date) => {
        if (!date) return 'Fecha no disponible';
        
        try {
          const dateObj = new Date(date);
          if (isNaN(dateObj.getTime())) return 'Fecha no válida';
          
          // Obtener día de la semana y fecha en zona horaria de Ecuador
          const options = { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long',
            timeZone: 'America/Guayaquil' // Zona horaria de Ecuador
          };
          
          // Usar la API de Intl para formatear en español
          return new Intl.DateTimeFormat('es-ES', options).format(dateObj);
        } catch (e) {
          console.error('Error al formatear fecha:', e);
          return String(date);
        }
      };

      const result = await resend.emails.send({
        from: defaultFrom,
        to: user.email,
        subject: 'Gracias por tu compra en Volta',
        html: `
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light">
            <meta name="supported-color-schemes" content="light">
            <title>Confirmación de Compra</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap');
            </style>
          </head>
          <body style="font-family: 'Work Sans', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #e9e9e9; color: #333333; -webkit-font-smoothing: antialiased;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #e9e9e9;">
                    <!-- Logo -->
                    <tr>
                      <td align="center" style="padding-bottom: 30px;">
                        <img src="https://mt5159g3si.ufs.sh/f/yBjaix5tW5pfBPQURnKdJoRQbl2LZmCtSih9E6FaWHqkPp5U" alt="Volta Logo" width="60" style="display: block;">
                      </td>
                    </tr>
                    
                    <!-- Título -->
                    <tr>
                      <td align="center" style="padding-bottom: 50px;">
                        <h1 style="font-family: 'Work Sans', Helvetica, Arial, sans-serif; color: #000000; font-size: 28px; font-weight: 600; margin: 0;">¡Gracias por tu compra!</h1>
                      </td>
                    </tr>
                    
                    <!-- Información de la compra en bloques -->
                    <tr>
                      <td style="padding-bottom: 30px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="background-color: #f8f9fa; border-radius: 12px; padding: 25px;">
                              <h2 style="font-family: 'Work Sans', Helvetica, Arial, sans-serif; color: #000000; font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 20px;">Detalles de tu compra</h2>
                              
                              <div style="margin-bottom: 15px;">
                                <strong style="font-family: 'Work Sans', Arial, sans-serif; font-weight: 600; font-size: 16px;">Nombre:</strong> 
                                <span style="font-family: 'Work Sans', Arial, sans-serif; font-size: 16px;">${user.nombre || 'Cliente'}</span>
                              </div>
                              
                              <div style="margin-bottom: 15px;">
                                <strong style="font-family: 'Work Sans', Arial, sans-serif; font-weight: 600; font-size: 16px;">Paquete:</strong> 
                                <span style="font-family: 'Work Sans', Arial, sans-serif; font-size: 16px;">${paquete.clasesOriginales || paquete.clases_originales || 0} clases</span>
                              </div>
                              
                              <div style="margin-bottom: 15px;">
                                <strong style="font-family: 'Work Sans', Arial, sans-serif; font-weight: 600; font-size: 16px;">Fecha de compra:</strong> 
                                <span style="font-family: 'Work Sans', Arial, sans-serif; font-size: 16px;">${formatDate(paquete.fechaCompra || paquete.fecha_compra)}</span>
                              </div>
                              
                              <div style="margin-bottom: 15px;">
                                <strong style="font-family: 'Work Sans', Arial, sans-serif; font-weight: 600; font-size: 16px;">Fecha de expiración:</strong> 
                                <span style="font-family: 'Work Sans', Arial, sans-serif; font-size: 16px;">${formatDate(paquete.fechaExpiracion || paquete.fecha_expiracion)}</span>
                              </div>
                              
                              ${paquete.transactionId || paquete.transaction_id ? `
                              <div style="margin-bottom: 15px;">
                                <strong style="font-family: 'Work Sans', Arial, sans-serif; font-weight: 600; font-size: 16px;">ID de transacción:</strong> 
                                <span style="font-family: 'Work Sans', Arial, sans-serif; font-size: 16px;">${paquete.transactionId || paquete.transaction_id}</span>
                              </div>
                              ` : ''}
                              
                              ${paquete.authorizationCode || paquete.authorization_code ? `
                              <div style="margin-bottom: 15px;">
                                <strong style="font-family: 'Work Sans', Arial, sans-serif; font-weight: 600; font-size: 16px;">Código de autorización:</strong> 
                                <span style="font-family: 'Work Sans', Arial, sans-serif; font-size: 16px;">${paquete.authorizationCode || paquete.authorization_code}</span>
                              </div>
                              ` : ''}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Cómo usar en un bloque -->
                    <tr>
                      <td style="padding-bottom: 30px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="background-color: #e8f4ff; border-radius: 12px; padding: 25px;">
                              <h2 style="font-family: 'Work Sans', Helvetica, Arial, sans-serif; color: #000000; font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 20px;">¿Cómo usar tus clases?</h2>
                              
                              <p style="font-family: 'Work Sans', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.5; margin-bottom: 15px;">
                                Tus ${paquete.clasesOriginales || paquete.clases_originales || 0} clases ya están disponibles en tu cuenta. Para reservar:
                              </p>
                              
                              <ol style="font-family: 'Work Sans', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; margin-top: 10px; padding-left: 25px;">
                                <li style="margin-bottom: 8px;">Ingresa a la app de Volta</li>
                                <li style="margin-bottom: 8px;">Selecciona la fecha y hora que prefieras</li>
                                <li style="margin-bottom: 8px;">Elige tu bicicleta favorita</li>
                                <li style="margin-bottom: 8px;">¡Listo! Te esperamos en clase</li>
                              </ol>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="text-align: center; padding-top: 20px;">
                        <p style="font-family: 'Work Sans', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.5; margin-bottom: 15px;">
                          Si tienes alguna pregunta, contáctanos por WhatsApp al <a href="https://wa.me/593964193931" style="color: #3D4AF5; text-decoration: none;">+593 96 419 3931</a>
                        </p>
                        
                        <p style="font-family: 'Work Sans', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.5; margin-bottom: 15px; color: #777777;">
                          &copy; ${new Date().getFullYear()} Volta. Todos los derechos reservados.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
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
      // Obtener valores desde las variables de entorno
      const emailFrom = process.env.RESEND_FROM_EMAIL || 'hola@volta.com';
      const defaultFrom = `Volta <${emailFrom}>`;
      const defaultReplyTo = process.env.RESEND_REPLY_TO || 'hola@volta.com';
      console.log('enviarConfirmacionReserva', booking);
      const fechaEcuador = new Date(booking.fecha_hora).toLocaleString('es-ES', { timeZone: 'America/Guayaquil' });
      console.log('enviarConfirmacionReserva (hora Ecuador):', fechaEcuador);

      // Funciones mejoradas para formatear fechas y horas
      const formatDate = (date) => {
        if (!date) return 'Fecha no disponible';
        
        try {
          const dateObj = new Date(date);
          if (isNaN(dateObj.getTime())) return 'Fecha no válida';
          
          // Obtener día de la semana y fecha en zona horaria de Ecuador
          const options = { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long',
            timeZone: 'America/Guayaquil' // Zona horaria de Ecuador
          };
          
          // Usar la API de Intl para formatear en español
          return new Intl.DateTimeFormat('es-ES', options).format(dateObj);
        } catch (e) {
          console.error('Error al formatear fecha:', e);
          return String(date);
        }
      };

      const formatTime = (date) => {
        if (!date) return 'Hora no disponible';
        
        try {
          const dateObj = new Date(date);
          if (isNaN(dateObj.getTime())) return 'Hora no válida';
          
          // Formato de 24 horas ajustado a la zona horaria de Ecuador
          const options = { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false,
            timeZone: 'America/Guayaquil' // Zona horaria de Ecuador
          };
          return dateObj.toLocaleTimeString('es-ES', options);
        } catch (e) {
          console.error('Error al formatear hora:', e);
          return String(date);
        }
      };

      // Extraer información del instructor de manera segura
      let instructorName = 'No especificado';
      
      // Depuración de la estructura de clase e instructor
      
      if (clase) {
     
        
        // La estructura ahora será más directa gracias a los cambios en el controlador
        if (clase.instructor?.nombreCompleto) {
          instructorName = clase.instructor.nombreCompleto;
        } else if (clase.instructor?.nombre_completo) {
          instructorName = clase.instructor.nombre_completo;
        } else if (typeof clase.instructor === 'string') {
          instructorName = clase.instructor;
        }
      }
      
      // Procesar las bicicletas de manera segura
      let bicyclesList = [];
      
      if (Array.isArray(bicycles) && bicycles.length > 0) {
        bicyclesList = bicycles.map(bike => {
          // Intentar obtener el número de bicicleta desde diferentes estructuras posibles
          if (bike.attributes?.bicycleNumber) {
            return bike.attributes.bicycleNumber;
          } else if (bike.bicycleNumber) {
            return bike.bicycleNumber;
          } else if (bike.attributes?.numero) {
            return bike.attributes.numero;
          } else if (bike.numero) {
            return bike.numero;
          } else {
            return bike.id || '?';
          }
        });
      }

      // Verificar si tenemos datos válidos para fecha y hora
      let fechaReserva = 'Fecha no disponible';
      let horaReserva = 'Hora no disponible';
      
      if (booking?.fechaHora || booking?.fecha_hora) {
        const fechaHora = booking.fechaHora || booking.fecha_hora;
        fechaReserva = formatDate(fechaHora);
        horaReserva = formatTime(fechaHora);
      }

      const result = await resend.emails.send({
        from: defaultFrom,
        to: user.email,
        subject: '¡Tu reserva en Volta está confirmada!',
        html: `
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light">
            <meta name="supported-color-schemes" content="light">
            <title>Confirmación de Reserva</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap');
            </style>
          </head>
          <body style="font-family: 'Work Sans', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #e9e9e9; color: #333333; -webkit-font-smoothing: antialiased;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #e9e9e9;">
                    <!-- Logo -->
                    <tr>
                      <td align="center" style="padding-bottom: 30px;">
                        <img src="https://mt5159g3si.ufs.sh/f/yBjaix5tW5pfBPQURnKdJoRQbl2LZmCtSih9E6FaWHqkPp5U" alt="Volta Logo" width="60" style="display: block;">
                      </td>
                    </tr>
                    
                    <!-- Título -->
                    <tr>
                      <td align="center" style="padding-bottom: 50px;">
                        <h1 style="font-family: 'Work Sans', Helvetica, Arial, sans-serif; color: #000000; font-size: 28px; font-weight: 600; margin: 0;">Lista para dar una Volta</h1>
                      </td>
                    </tr>
                    
                    <!-- Información de reserva -->
                    <tr>
                      <td style="padding-bottom: 30px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="background-color: #f8f9fa; border-radius: 12px; padding: 25px;">
                              <h2 style="font-family: 'Work Sans', Helvetica, Arial, sans-serif; color: #000000; font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 20px;">Detalles de tu reserva</h2>
                              
                              <div style="margin-bottom: 15px;">
                                <strong style="font-family: 'Work Sans', Arial, sans-serif; font-weight: 600; font-size: 16px;">Bici${bicyclesList.length > 1 ? 's' : ''}:</strong> 
                                <span style="font-family: 'Work Sans', Arial, sans-serif; font-size: 16px;">${bicyclesList.length > 0 ? bicyclesList.join(', ') : '?'}</span>
                              </div>
                              
                              <div style="margin-bottom: 15px;">
                                <strong style="font-family: 'Work Sans', Arial, sans-serif; font-weight: 600; font-size: 16px;">Día:</strong> 
                                <span style="font-family: 'Work Sans', Arial, sans-serif; font-size: 16px;">${fechaReserva}</span>
                              </div>
                              
                              <div style="margin-bottom: 15px;">
                                <strong style="font-family: 'Work Sans', Arial, sans-serif; font-weight: 600; font-size: 16px;">Hora:</strong> 
                                <span style="font-family: 'Work Sans', Arial, sans-serif; font-size: 16px;">${horaReserva}</span>
                              </div>
                              
                              <div style="margin-bottom: 15px;">
                                <strong style="font-family: 'Work Sans', Arial, sans-serif; font-weight: 600; font-size: 16px;">Instructor:</strong> 
                                <span style="font-family: 'Work Sans', Arial, sans-serif; font-size: 16px;">${instructorName}</span>
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Políticas en bloques -->
                    <tr>
                      <td style="padding-bottom: 30px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="background-color: #e8f4ff; border-radius: 12px; padding: 25px;">
                              <h2 style="font-family: 'Work Sans', Helvetica, Arial, sans-serif; color: #000000; font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 20px;">Políticas importantes</h2>
                              
                              <p style="font-family: 'Work Sans', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.5; margin-bottom: 15px;">
                                Recuerda que puedes cancelar tu clase hasta 12 horas antes de la clase reservada, caso contrario perderás el crédito de ese booking.
                              </p>
                              
                              <p style="font-family: 'Work Sans', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.5; margin-bottom: 15px;">
                                Por respeto a nuestros coaches y a nuestros riders pedimos puntualidad ya que no podemos interrumpir la sesión en curso. Ten presente que <span style="font-weight: 700; font-style: italic;">tu bici será liberada 4 minutos antes de que inicie la clase.</span>
                              </p>
                              
                              <p style="font-family: 'Work Sans', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.5; margin-bottom: 15px;">
                                Para que todos disfrutemos de la sesión no se permite el uso de teléfonos celulares dentro del estudio.
                              </p>
                              
                              <p style="font-family: 'Work Sans', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.5; margin-bottom: 0;">
                                Por seguridad, los créditos no son transferibles. Asegúrate de reservar tu bici desde tu perfil creado en nuestra app.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="text-align: center; padding-top: 20px;">
                        <p style="font-family: 'Work Sans', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.5; margin-bottom: 15px;">
                          Si tienes alguna pregunta, contáctanos por WhatsApp al <a href="https://wa.me/593964193931" style="color: #3D4AF5; text-decoration: none;">+593 96 419 3931</a>
                        </p>
                        
                        <p style="font-family: 'Work Sans', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.5; margin-bottom: 15px; color: #777777;">
                          &copy; ${new Date().getFullYear()} Volta. Todos los derechos reservados.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
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
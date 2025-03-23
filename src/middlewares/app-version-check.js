'use strict';

/**
 * Middleware para detectar versiones antiguas de la app y forzar actualización
 * 
 * Este middleware bloquea peticiones a las rutas antiguas usadas por versiones
 * obsoletas de la app, indicando al usuario que necesita actualizar.
 */

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    // Rutas que solo usa la versión antigua de la app
    const rutasAntiguas = [
      '/api/booking',
      '/api/bookings',
      '/api/booking/create',
      '/api/booking/update',
      '/booking/create',
      '/bookings/create',
      '/booking/update',
      '/bookings/update'
    ];
    
    // Rutas nuevas que no deben bloquearse
    const rutasNuevas = [
      '/api/bookings/reserve-and-update',
      '/api/bookings/cancel-and-refund',
      '/bookings/reserve-and-update',
      '/bookings/cancel-and-refund'
    ];
    
    // Obtener la ruta de la petición
    const rutaActual = ctx.request.url;
    
    // Si es una operación de creación o actualización en una ruta antigua y no es una ruta nueva
    if (
      (rutasAntiguas.includes(rutaActual) || rutasNuevas.includes(rutaActual)) &&
      ['POST', 'PUT', 'DELETE'].includes(ctx.request.method)
    ) {
      strapi.log.warn(`Petición bloqueada a ruta antigua: ${rutaActual} - Método: ${ctx.request.method}`);
      
      ctx.status = 426; // Upgrade Required
      ctx.body = {
        message: "Es necesario actualizar la app para usar el sistema de reservas. Por favor, descarga la última versión.",
        error: {message: "Modo mantenimiento, estamos resolviendo problemas. Disculpe las molestias, desbloquearemos el acceso en breve."}, // Mensaje más amigable
        details: {
          bicicletasReservadas: [] // Para cumplir con el formato esperado
        }
      };
      
      return;
    }
    
    // Continuar con la petición si no es una ruta antigua o es solo lectura
    await next();
  };
}; 
'use strict';

/**
 * Middleware para bloquear solo las rutas de reservas y pagos (Nuvei)
 * 
 * Este middleware bloquea únicamente las acciones de reservas y pagos, 
 * permitiendo que el resto de la API funcione normalmente.
 */

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    // Rutas que SÍ deben bloquearse (reservas y pagos)
    const rutasBloqueadas = [
      // Rutas de reservas
      '/api/bookings/reserve-and-update',
      '/api/bookings',
      '/bookings/reserve-and-update',
      '/bookings',
      '/api/nuvei/auth-token',
      '/nuvei/auth-token',
      // Rutas de cancelación de reservas
      '/api/bookings/cancel-and-refund',
      '/bookings/cancel-and-refund',
      // Rutas de Nuvei (pagos)
      '/api/nuvei',
      '/nuvei',
      // Rutas de compra de paquetes
      '/api/purchased-ride-packs/comprar-con-transaccion',
      '/api/purchased-ride-packs',
      '/purchased-ride-packs/comprar-con-transaccion',
      '/purchased-ride-packs'
    ];
    
    // Obtener la ruta de la petición
    const rutaActual = ctx.request.url;
    const metodo = ctx.request.method;
    
    // Verificar si es una ruta que debe bloquearse
    const esRutaBloqueada = rutasBloqueadas.some(ruta => {
      // Para rutas exactas
      if (rutaActual === ruta) return true;
      
      // Para rutas con parámetros (ej: /api/bookings/123)
      if (ruta.endsWith('s') && rutaActual.startsWith(ruta + '/')) return true;
      
      return false;
    });
    
    // Verificar si es una ruta de Nuvei (bloquear todos los métodos)
    const esRutaNuvei = rutaActual.includes('/nuvei');
    
    // Bloquear: operaciones de escritura en todas las rutas + TODOS los métodos en rutas de Nuvei
    if (esRutaBloqueada && (['POST', 'PUT', 'DELETE'].includes(metodo) || esRutaNuvei)) {
      strapi.log.warn(`Ruta bloqueada - Petición a: ${rutaActual} - Método: ${metodo}`);
      
      ctx.status = 426; // Upgrade Required
      
      // Si es una ruta de Nuvei, usar formato específico para la UI
      if (esRutaNuvei) {
        ctx.body = {
          message: "Es necesario actualizar la aplicación para realizar pagos. Por favor, descarga la última versión desde la tienda de aplicaciones.",
          error: "Debes actualizar la aplicación para realizar pagos. Por favor, descarga la última versión desde la tienda de aplicaciones.",
          details: {
            updateRequired: true,
            blockedAction: "pagos_nuvei"
          }
        };
      } else {
        // Para otras rutas (reservas, etc.)
        ctx.body = {
          message: "Es necesario actualizar la aplicación para realizar reservas. Por favor, descarga la última versión desde la tienda de aplicaciones.",
          error: {
            message: "Debes actualizar la aplicación para realizar reservas. Por favor, descarga la última versión desde la tienda de aplicaciones.",
            code: "UPDATE_REQUIRED"
          },
          details: {
            updateRequired: true,
            blockedAction: "reservas"
          }
        };
      }
      
      return;
    }
    
    // Continuar con la petición si no es una ruta bloqueada
    await next();
  };
}; 
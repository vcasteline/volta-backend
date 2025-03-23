'use strict';

/**
 * booking router
 */

// Rutas personalizadas
module.exports = {
  routes: [
    // Ruta personalizada para reserva y actualización atómica
    {
      method: 'POST',
      path: '/bookings/reserve-and-update',
      handler: 'booking.reserveAndUpdateCredits',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // Ruta personalizada para cancelación y devolución de créditos
    {
      method: 'PUT',
      path: '/bookings/:id/cancel-and-refund',
      handler: 'booking.cancelAndRefundCredits',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // Rutas CRUD estándar
    {
      method: 'GET',
      path: '/bookings',
      handler: 'booking.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/bookings/:id',
      handler: 'booking.findOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/bookings',
      handler: 'booking.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/bookings/:id',
      handler: 'booking.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/bookings/:id',
      handler: 'booking.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};

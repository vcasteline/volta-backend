'use strict';

/**
 * purchased-ride-pack router
 */

// Rutas personalizadas
module.exports = {
  routes: [
    // Ruta personalizada para compra de paquete con transacción atómica
    {
      method: 'POST',
      path: '/purchased-ride-packs/comprar-con-transaccion',
      handler: 'purchased-ride-pack.comprarPaqueteConTransaccion',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // Rutas CRUD estándar
    {
      method: 'GET',
      path: '/purchased-ride-packs',
      handler: 'purchased-ride-pack.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/purchased-ride-packs/:id',
      handler: 'purchased-ride-pack.findOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/purchased-ride-packs',
      handler: 'purchased-ride-pack.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/purchased-ride-packs/:id',
      handler: 'purchased-ride-pack.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/purchased-ride-packs/:id',
      handler: 'purchased-ride-pack.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};

module.exports = {
    routes: [
      {
        method: 'GET',
        path: '/nuvei/auth-token',
        handler: 'nuvei.getAuthToken',
        config: {
          auth: false, // Considera añadir autenticación apropiada
        },
      },
    ],
  };
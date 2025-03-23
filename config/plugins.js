module.exports = ({ env }) => ({
    email: {
        config: {
          provider: 'nodemailer',
          providerOptions: {
            host: 'smtp.gmail.com',
            port: 587,
            auth: {
              user: 'developmentvolta@gmail.com',
              pass: 'inpl nzew xcyw gqzq',
            },
            
          },
          settings: {
            defaultFrom: 'developmentvolta@gmail.com',
            defaultReplyTo: 'developmentvolta@gmail.com',
          },
        },
      },
      'users-permissions': {
        config: {
          jwt: {
            expiresIn: '2y',
          },
        },
      },
  resend: {
    config: {
      apiKey: env('RESEND_API_KEY', 'tu_api_key_aqui'),
      defaultFrom: env('RESEND_FROM_EMAIL', 'hola@volta.com'),
      defaultReplyTo: env('RESEND_REPLY_TO', 'hola@volta.com'),
    },
  },
  'email-designer': {
    enabled: true,
  },
});

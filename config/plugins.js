module.exports = () => ({
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
      "rest": {
        defaultLimit: 500,
        maxLimit: 500,
        withCount: true,
      },
      
});


const { generateNuveiAuthToken } = require('../../../utils/nuveiAuth');

module.exports = {
  async getAuthToken(ctx) {
    const token = generateNuveiAuthToken();
    ctx.send({ token });
  },
};

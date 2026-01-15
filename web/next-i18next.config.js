/** @type {import('next-i18next').UserConfig} */
module.exports = {
  i18n: {
    defaultLocale: 'he',
    locales: ['he'],
  },
  localePath: './locales',
  reloadOnPrerender: process.env.NODE_ENV === 'development',
};

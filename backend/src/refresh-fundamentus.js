const { refreshFundamentus } = require('./fundamentus');

refreshFundamentus()
  .then(({ companies, failures }) => {
    console.log(`Cache Fundamentus atualizado: ${companies} ativo(s).`);
    if (failures.length) console.warn(`${failures.length} ativo(s) não puderam ser atualizados.`, failures);
  })
  .catch((error) => {
    console.error(`Não foi possível atualizar o cache Fundamentus: ${error.message}`);
    process.exitCode = 1;
  });

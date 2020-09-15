const https = require('https');
const fs = require('fs');
const path = require('path');
const util = require('util');

const writeFile = util.promisify(fs.writeFile);

const baseDataURL = 'https://nswdac-covid-19-postcode-heatmap.azurewebsites.net/datafiles';
const baseDataStoreURL = 'https://raw.githubusercontent.com/maxgherman/nsw-coronavirus/gh-pages';
const baseSaveDataFolder = 'public';
const dateTimeFormat = new Intl.DateTimeFormat('en', {
  month: 'short', day: '2-digit', year: 'numeric'
});

const daysMap = [...new Array(14).keys()]
  .reduce((acc, curr) => {
    const date = new Date();
    date.setDate(date.getDate() - curr);
    const dateParts = dateTimeFormat.formatToParts(date);
    const day = dateParts.filter((item) => item.type === 'day')[0];
    const month = dateParts.filter((item) => item.type === 'month')[0];
    const year = dateParts.filter((item) => item.type === 'year')[0];

    acc.set(`Day${curr}`, `${day.value}-${month.value}-${year.value}`);
    return acc;
  }, new Map());

const sort = (a, b) => {
  const aDate = new Date(a.Date);
  const bDate = new Date(b.Date);

  return aDate > bDate ? 1 : (aDate < bDate ? -1 : 0);
};

const download = (url) => new Promise((resolve, reject) => {
  let data = '';

  https.get(url, (resp) => {
    resp.on('data', (chunk) => {
      data += chunk;
    });

    resp.on('end', () => {
      resolve(data);
    });
  })
    .on('error', (err) => {
      console.log(reject(err));
      process.exit(1);
    });
});

const arrangeByDate = (data, store) => data.data.reduce((acc, curr) => {
  const currentYear = new Date().getFullYear();
  const date = curr.Date;

  const parsedDate = /^[0-9]{2}-[a-z,A-Z]{3}$/.test(date) ? `${date}-${currentYear}` : curr.Date;
  curr.Date = parsedDate;

  const entry = acc.has(parsedDate) ? acc.get(parsedDate) : new Map();
  entry.set(curr.POA_NAME16, curr);
  acc.set(parsedDate, entry);

  return acc;
}, store);

const mergeTests = async (testUrl, baseTestsUrl) => {
  const tests = await download(testUrl);
  const baseTests = await download(baseTestsUrl);

  const store = arrangeByDate(JSON.parse(baseTests), new Map());
  arrangeByDate(JSON.parse(tests), store);

  const maps = [...store.values()]
    .map((item) => [...item.values()])
    .flat();

  maps.sort(sort);

  return {
    data: maps
  };
};

const mergeCases = async (casesUrl, baseCasesUrl, activeCasesUrl) => {
  const cases = await download(casesUrl).then(JSON.parse);
  const baseCases = await download(baseCasesUrl).then(JSON.parse);
  const activeCases = await download(activeCasesUrl).then(JSON.parse);

  const caseStore = arrangeByDate(cases, new Map());
  const mergedCases = arrangeByDate(baseCases, caseStore);

  activeCases.data.forEach((activeCase) => {
    Object.keys(activeCase).forEach((activeCaseKey) => {
      if (activeCaseKey === 'POA_NAME16') {
        return;
      }

      if (daysMap.has(activeCaseKey)) {
        const dateKey = daysMap.get(activeCaseKey);

        if (mergedCases.has(dateKey)) {
          const casesByDate = mergedCases.get(dateKey);

          if (casesByDate.has(activeCase.POA_NAME16)) {
            const caseItem = casesByDate.get(activeCase.POA_NAME16);
            const active = activeCase[activeCaseKey];
            caseItem.Recovered = caseItem.Cases - active;
          }
        }
      }
    });
  });

  const maps = [...mergedCases.values()]
    .map((item) => [...item.values()])
    .flat();

  maps.sort(sort);

  return {
    data: maps
  };
};

const run = async (baseDir) => {
  const population = await download(`${baseDataURL}/population.json`);
  const postCodes = await download(`${baseDataURL}/nswpostcodes_final.json`);

  await writeFile(path.resolve(baseDir, `${baseSaveDataFolder}/population.json`), population);
  await writeFile(path.resolve(baseDir, `${baseSaveDataFolder}/post-codes.json`), postCodes);

  console.log('complete writing base files');

  const cases = await mergeCases(
    `${baseDataURL}/data_cases2.json`,
    `${baseDataStoreURL}/cases-total.json`,
    `${baseDataURL}/active_cases.json`
  );

  await writeFile(
    path.resolve(baseDir, `${baseSaveDataFolder}/cases-total.json`),
    JSON.stringify(cases)
  );

  const resultTests = await mergeTests(
    `${baseDataURL}/data_tests.json`,
    `${baseDataStoreURL}/tests-total.json`,
  );

  await writeFile(
    path.resolve(baseDir, `${baseSaveDataFolder}/tests-total.json`),
    JSON.stringify(resultTests)
  );

  console.log('complete writing tests');

  process.exit();
};

module.exports = {
  execute: (baseDir) => {
    run(baseDir);
    console.log('Loading ...');
  }
};

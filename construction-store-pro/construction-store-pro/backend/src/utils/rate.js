module.exports.getRate = async db => { const r = await db.exchangeRate.findFirst({ orderBy: { effectiveOn: 'desc' } }); return r ? Number(r.sosPerUsd) : 570; };

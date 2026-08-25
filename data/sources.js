window.MinshengSources = [
  { id: 'pboc', name: '中国人民银行', type: 'official_primary', trustLevel: 'high', country: 'CN', officialDomains:['pbc.gov.cn','www.pbc.gov.cn'] },
  { id: 'nbs', name: '国家统计局', type: 'official_primary', trustLevel: 'high', country: 'CN' },
  { id: 'mof', name: '财政部', type: 'official_primary', trustLevel: 'high', country: 'CN' },
  { id: 'gacc', name: '海关总署', type: 'official_primary', trustLevel: 'high', country: 'CN' },
  { id: 'safe', name: '国家外汇管理局', type: 'official_primary', trustLevel: 'high', country: 'CN' },
  { id: 'imf', name: 'IMF', type: 'multilateral', trustLevel: 'high', country: 'INT' },
  { id: 'world_bank', name: 'World Bank', type: 'multilateral', trustLevel: 'high', country: 'INT' },
  { id: 'bis', name: 'BIS', type: 'multilateral', trustLevel: 'high', country: 'INT' },
  { id: 'jpmorgan', name: 'JPMorgan', type: 'investment_bank', trustLevel: 'medium', country: 'US' },
  { id: 'goldman', name: 'Goldman Sachs', type: 'investment_bank', trustLevel: 'medium', country: 'US' },
  { id: 'morgan_stanley', name: 'Morgan Stanley', type: 'investment_bank', trustLevel: 'medium', country: 'US' },
  { id: 'ubs', name: 'UBS', type: 'investment_bank', trustLevel: 'medium', country: 'CH' },
  { id: 'sample_survey', name: '演示调查样本', type: 'survey', trustLevel: 'low', country: 'CN' }
];
window.MinshengSources.forEach(source => Object.assign(source,{authority:source.trustLevel==='high'?.95:source.trustLevel==='medium'?.75:.45,transparency:source.type==='official_primary'?.9:.6,methodologyClarity:source.type==='official_primary'?.9:.55,historicalReliability:null,qualityConfigStatus:'DEMO / researcher configuration'}));

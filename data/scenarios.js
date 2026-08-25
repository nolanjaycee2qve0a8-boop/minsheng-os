window.MinshengScenarios = [
  {id:'baseline',name:'基准情景',code:'BASELINE',description:'当前条件延续；用于比较而非预测。',changes:{second_hand_home_price:0,income_expectation:0,mortgage_rate:0},confidence:.55},
  {id:'property_stress',name:'房地产压力',code:'STRESS',description:'房价与成交同步走弱的假设情景。',changes:{second_hand_home_price:-10,property_transactions:-20,income_expectation:-5},confidence:.42},
  {id:'reform_upside',name:'制度摩擦改善',code:'OPTIMISTIC',description:'PEF下降与创业活跃度改善的条件性推演。',changes:{policy_execution_friction:-10,income_expectation:3},confidence:.35}
];

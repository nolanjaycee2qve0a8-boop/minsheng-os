/* Deterministic NBS article parser.  It emits only explicitly named statements;
   candidates remain staged until a reviewer commits them. */
window.MinshengNbsReleaseParser=(()=>{
 const rule=(id,regex,seriesId,indicatorId,transformation,aggregation,unit='%',nominalReal='NOMINAL')=>({id,regex,seriesId,indicatorId,transformation,aggregation,unit,nominalReal});
 const rules=[
  rule('industrial_monthly_yoy',/(?<![—-])(\d{1,2})\s*\u6708\u4efd?[^。；]{0,100}\u89c4\u6a21\u4ee5\u4e0a\u5de5\u4e1a\u589e\u52a0\u503c[^。；]{0,80}\u540c\u6bd4(?:\u5b9e\u9645)?(\u589e\u957f|\u4e0b\u964d)\s*([\d.]+)%/,'CN.NBS.INDUSTRIAL_VALUE_ADDED.MONTHLY.YOY','industrial_value_added_yoy','YOY','MONTH','%','REAL'),
  rule('industrial_ytd_yoy',/1\s*(?:-|—|\u81f3)\s*(\d{1,2})\s*\u6708[^。；]{0,100}\u89c4\u6a21\u4ee5\u4e0a\u5de5\u4e1a\u589e\u52a0\u503c[^。；]{0,80}\u540c\u6bd4(?:\u5b9e\u9645)?(\u589e\u957f|\u4e0b\u964d)\s*([\d.]+)%/,'CN.NBS.INDUSTRIAL_VALUE_ADDED.YTD.YOY','industrial_value_added_ytd_yoy','YTD_YOY','YTD','%','REAL'),
  rule('retail_monthly_level',/(?<![—-])(\d{1,2})\s*\u6708\u4efd?[^。；]{0,100}\u793e\u4f1a\u6d88\u8d39\u54c1\u96f6\u552e\u603b\u989d\s*([\d.]+)\s*\u4ebf\u5143/,'CN.NBS.RETAIL_SALES.MONTHLY.LEVEL','retail_sales_total','RAW','MONTH','亿元'),
  rule('retail_monthly_yoy',/(?<![—-])(\d{1,2})\s*\u6708\u4efd?[^。；]{0,100}\u793e\u4f1a\u6d88\u8d39\u54c1\u96f6\u552e\u603b\u989d[^。；]{0,100}\u540c\u6bd4(\u589e\u957f|\u4e0b\u964d)\s*([\d.]+)%/,'CN.NBS.RETAIL_SALES.MONTHLY.YOY','retail_sales_yoy','YOY','MONTH'),
  rule('retail_ytd_level',/1\s*(?:-|—|\u81f3)\s*(\d{1,2})\s*\u6708[^。；]{0,100}\u793e\u4f1a\u6d88\u8d39\u54c1\u96f6\u552e\u603b\u989d\s*([\d.]+)\s*\u4ebf\u5143/,'CN.NBS.RETAIL_SALES.YTD.LEVEL','retail_sales_ytd','YTD','YTD','亿元'),
  rule('retail_ytd_yoy',/1\s*(?:-|—|\u81f3)\s*(\d{1,2})\s*\u6708[^。；]{0,100}\u793e\u4f1a\u6d88\u8d39\u54c1\u96f6\u552e\u603b\u989d[^。；]{0,100}\u540c\u6bd4(\u589e\u957f|\u4e0b\u964d)\s*([\d.]+)%/,'CN.NBS.RETAIL_SALES.YTD.YOY','retail_sales_ytd_yoy','YTD_YOY','YTD'),
  rule('property_area_ytd_level',/1\s*(?:-|—|\u81f3)\s*(\d{1,2})\s*\u6708[^。；]{0,140}\u5546\u54c1\u623f\u9500\u552e\u9762\u79ef\s*([\d.]+)\s*\u4e07\u5e73\u65b9\u7c73/,'CN.NBS.PROPERTY_SALES_AREA.YTD.LEVEL','property_sales_area','YTD','YTD','万平方米'),
  rule('property_area_ytd_yoy',/1\s*(?:-|—|\u81f3)\s*(\d{1,2})\s*\u6708[^。；]{0,140}\u5546\u54c1\u623f\u9500\u552e\u9762\u79ef[^。；]{0,100}\u540c\u6bd4(\u589e\u957f|\u4e0b\u964d)\s*([\d.]+)%/,'CN.NBS.PROPERTY_SALES_AREA.YTD.YOY','property_sales_area_yoy','YTD_YOY','YTD'),
  rule('property_value_ytd_level',/1\s*(?:-|—|\u81f3)\s*(\d{1,2})\s*\u6708[^。；]{0,140}\u5546\u54c1\u623f\u9500\u552e\u989d\s*([\d.]+)\s*\u4ebf\u5143/,'CN.NBS.PROPERTY_SALES_VALUE.YTD.LEVEL','property_sales_value','YTD','YTD','亿元'),
  rule('property_value_ytd_yoy',/1\s*(?:-|—|\u81f3)\s*(\d{1,2})\s*\u6708[^。；]{0,140}\u5546\u54c1\u623f\u9500\u552e\u989d[^。；]{0,100}\u540c\u6bd4(\u589e\u957f|\u4e0b\u964d)\s*([\d.]+)%/,'CN.NBS.PROPERTY_SALES_VALUE.YTD.YOY','property_sales_value_yoy','YTD_YOY','YTD'),
  rule('private_fai_ytd_level',/1\s*(?:-|—|\u81f3)\s*(\d{1,2})\s*\u6708[^。；]{0,100}\u6c11\u95f4\u56fa\u5b9a\u8d44\u4ea7\u6295\u8d44\s*([\d.]+)\s*\u4ebf\u5143/,'CN.NBS.PRIVATE_FAI.YTD.LEVEL','private_fixed_asset_investment','YTD','YTD','亿元'),
  rule('private_fai_ytd_yoy',/1\s*(?:-|—|\u81f3)\s*(\d{1,2})\s*\u6708[^。；]{0,100}\u6c11\u95f4\u56fa\u5b9a\u8d44\u4ea7\u6295\u8d44[^。；]{0,100}\u540c\u6bd4(\u589e\u957f|\u4e0b\u964d)\s*([\d.]+)%/,'CN.NBS.PRIVATE_FAI.YTD.YOY','private_fixed_asset_investment_yoy','YTD_YOY','YTD')
 ];
 const clean=html=>String(html||'').replace(/<\/(?:p|div|li|tr|h\d)>/gi,'\n').replace(/<[^>]+>/g,'').replace(/\r/g,'').split('\n').map(x=>x.replace(/&nbsp;/g,' ').replace(/\s+/g,'').trim()).filter(Boolean);
 const days=(year,month)=>new Date(Date.UTC(+year,+month,0)).getUTCDate();
 function parse({html,sourceDocumentId,publicationDate}){
  const paragraphs=clean(html),text=paragraphs.join('。'),year=(publicationDate||text).match(/20\d{2}/)?.[0],candidates=[],seen=new Set();
  const methodologyWarning=/(可比口径|普查修订|历史修订|季节调整模型.*修订)/.test(text);
  const emit=(item,month,value,originalText)=>{const isYtd=item.aggregation==='YTD',janFeb=isYtd&&month===2,period=`${year}-${String(month).padStart(2,'0')}`,paragraphIndex=Math.max(0,paragraphs.findIndex(p=>p.includes(originalText.slice(0,Math.min(18,originalText.length)))));if(!Number.isFinite(value)||seen.has(`${item.seriesId}:${period}`))return;seen.add(`${item.seriesId}:${period}`);candidates.push({ruleId:item.id,seriesId:item.seriesId,indicatorId:item.indicatorId,value,unit:item.unit,period,periodKind:janFeb?'JAN_FEB_COMBINED':isYtd?'YTD':'MONTH',periodStart:isYtd?`${year}-01-01`:`${period}-01`,periodEnd:isYtd?`${period}-${String(days(year,month)).padStart(2,'0')}`:null,transformation:item.transformation,aggregation:item.aggregation,nominalReal:item.nominalReal,sourceDocumentId,parserVersion:'nbs-release-parser-1.1.0',originalText,sectionTitle:null,paragraphIndex,tableTitle:null,status:'PARSED',methodologyHints:methodologyWarning?['METHODOLOGY_REVIEW_REQUIRED']:[]});};
  rules.forEach(item=>{const match=text.match(item.regex);if(!match||!year)return;const valueIndex=item.unit==='%'?3:2,signIndex=item.unit==='%'?2:null;emit(item,Number(match[1]),Number(match[valueIndex])*(signIndex&&match[signIndex]==='下降'?-1:1),match[0]);});
  // Comprehensive releases often state the YTD period once, then list several
  // named component statistics.  Reuse only that explicit article context;
  // never manufacture a monthly value from a cumulative statement.
  const ytdMonth=text.match(/1\s*(?:-|—|\u81f3)\s*(\d{1,2})\s*\u6708/ )?.[1];
  if(year&&ytdMonth){const contextual=[
   ['property_area_ytd_level','CN.NBS.PROPERTY_SALES_AREA.YTD.LEVEL','property_sales_area','YTD','YTD','万平方米',/商品房销售面积\s*([\d.]+)\s*万平方米/],
   ['property_area_ytd_yoy','CN.NBS.PROPERTY_SALES_AREA.YTD.YOY','property_sales_area_yoy','YTD_YOY','YTD','%',/商品房销售面积[^。；]{0,100}同比(增长|下降)\s*([\d.]+)%/],
   ['property_value_ytd_level','CN.NBS.PROPERTY_SALES_VALUE.YTD.LEVEL','property_sales_value','YTD','YTD','亿元',/商品房销售额\s*([\d.]+)\s*亿元/],
   ['property_value_ytd_yoy','CN.NBS.PROPERTY_SALES_VALUE.YTD.YOY','property_sales_value_yoy','YTD_YOY','YTD','%',/商品房销售额[^。；]{0,100}同比(增长|下降)\s*([\d.]+)%/],
   ['private_fai_ytd_yoy','CN.NBS.PRIVATE_FAI.YTD.YOY','private_fixed_asset_investment_yoy','YTD_YOY','YTD','%',/民间固定资产投资[^。；]{0,100}同比(增长|下降)\s*([\d.]+)%/]
  ];contextual.forEach(([id,seriesId,indicatorId,transformation,aggregation,unit,regex])=>{const match=text.match(regex);if(!match)return;const item={id,seriesId,indicatorId,transformation,aggregation,unit,nominalReal:'NOMINAL'},value=unit==='%'?Number(match[2])*(match[1]==='下降'?-1:1):Number(match[1]);emit(item,Number(ytdMonth),value,match[0]);});}
  return {text,paragraphs,candidates,status:candidates.length?'SUCCESS':'NO_EXPLICIT_TARGET_STATEMENT'};
 }
 return {parse,rules};
})();

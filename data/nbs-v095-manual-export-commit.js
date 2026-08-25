/* v0.9.5.1 manual import. Original NBS CSV exports remain external and
   immutable; SHA-256 and exact row locators supply their audit trail. */
(()=>{
 const root='sources/manul/nbs/';
 const seed=[
  ['industrial','查询结果-规模以上工业增加值同比增长.csv',1852,'23E11190B78C03BD5D36882DEF6BD8949124AA3207E6D836897CFAAB07B963C3','工业增加值同比增长官方导出'],
  ['retail_monthly','查询结果-社会消费品零售总额同比增长.csv',3298,'135D5EA84C455C6E6F1BB716B2663386A315AD4E58C0A2D5304780A2CA717FE5','社会消费品零售总额同比增长官方导出'],
  ['retail_ytd','查询结果-社会消费品零售总额累计同比增长.csv',3298,'29F943B4A558EC32027F5939755CEC5D2A1AF473C700F0089F0A0E0C9FDF48FC','社会消费品零售总额累计同比增长官方导出'],
  ['property_area','查询结果-商品房销售面积同比增长.csv',2209,'05E950E5D02CF68E83B13784DD616D192A92C5AB5E0432CAA0ACBA37950A1F19','商品房销售面积累计同比增长官方导出'],
  ['property_value','查询结果-商品房销售额同比增长.csv',1499,'D70CA28EF354B972276B796C70904349B80D5A81D308AFEA1FBF4DCC9A3ABC02','商品房销售额累计同比增长官方导出'],
  ['private_fai','查询结果-民间固定资产投资同比增长.csv',1840,'A6B49E38FA05291E3D9AAE1BCEC13BA4E13470E2CDBF5EC3B3A91D80D3BD9231','民间固定资产投资累计同比增长官方导出']
 ];
 const docs=seed.map(([key,fileName,fileSize,checksum,queryDescription])=>({id:`doc_nbs_export_${key}_202607`,title:queryDescription,sourceId:'nbs',sourceType:'official_primary',documentType:'dataset',status:'REAL_SOURCE',publicationDate:null,coverageStart:'2026-07',coverageEnd:'2026-07',originalUrl:null,localFileName:root+fileName,fileSize,checksum,exportMetadata:{sourcePortal:'国家数据',exportedBy:'USER',exportDate:null,queryDescription,originalFormat:'csv',convertedFormat:null,conversionPerformedBy:null},relatedIndicatorIds:[],relatedDataRecordIds:[],notes:'User-designated NBS export; nationwide monthly-data rows manually previewed and exact mappings reviewed.'}));
 const doc=id=>docs.find(item=>item.id===id),raw=item=>({id:`raw_${item.id}`,sourceId:'nbs',sourceDocumentId:item.id,fileName:item.localFileName,fileSize:item.fileSize,checksum:item.checksum,format:'csv',externalLocalSource:true,status:'IMMUTABLE_EXTERNAL_FILE_METADATA',notes:'Original official export remains unmodified at the user-provided local path.'});
 const make=(id,seriesId,indicatorId,value,sourceDocumentId,field,row)=>({id,seriesId,indicatorId,value,convertedValue:value,unit:'%',convertedUnit:'%',originalValue:String(value),originalUnit:'%',frequency:'monthly',observationType:'growth_rate',transformation:'YTD_YOY',aggregation:'YTD',period:'2026-07',periodKind:'YTD',periodStart:'2026-01-01',periodEnd:'2026-07-31',status:'REAL',sourceId:'nbs',sourceDocumentId,rawPayloadId:`raw_${sourceDocumentId}`,releaseDate:null,revision:0,historicalVintageType:'ORIGINAL',comparabilityAdjusted:false,qualityFlags:[],structuralGaps:[],missingReason:null,provenance:{fileName:doc(sourceDocumentId).localFileName,checksum:doc(sourceDocumentId).checksum,row,column:'数值',header:'指标',originalField:field,originalCell:String(value),layout:'LONG',mappingStatus:'VERIFIED',sourceVerification:'USER_CONFIRMED_OFFICIAL_EXPORT'},notes:'v0.9.5.1 manual review accepted an exact nationwide NBS field mapping.'});
 const records=[
  make('record_nbs_export_property_area_ytd_yoy_202607','CN.NBS.PROPERTY_SALES_AREA.YTD.YOY','property_sales_area_yoy',-11.8,'doc_nbs_export_property_area_202607','新建商品房销售面积累计增长 (%)',3),
  make('record_nbs_export_property_value_ytd_yoy_202607','CN.NBS.PROPERTY_SALES_VALUE.YTD.YOY','property_sales_value_yoy',-13.1,'doc_nbs_export_property_value_202607','新建商品房销售额累计增长 (%)',3),
  make('record_nbs_export_private_fai_ytd_yoy_202607','CN.NBS.PRIVATE_FAI.YTD.YOY','private_fixed_asset_investment_yoy',-9.4,'doc_nbs_export_private_fai_202607','民间固定资产投资累计增长 (%)',3)
 ];
 docs.forEach(item=>{if(!window.MinshengSourceDocuments.some(existing=>existing.id===item.id))window.MinshengSourceDocuments.push(item);if(!window.MinshengRawPayloads.some(existing=>existing.id===`raw_${item.id}`))window.MinshengRawPayloads.push(raw(item));});
 records.forEach(item=>{if(!window.MinshengDataRecords.some(existing=>existing.id===item.id))window.MinshengDataRecords.push(item);const source=doc(item.sourceDocumentId);if(!source.relatedDataRecordIds.includes(item.id))source.relatedDataRecordIds.push(item.id);if(!source.relatedIndicatorIds.includes(item.indicatorId))source.relatedIndicatorIds.push(item.indicatorId);});
 const supporting={record_nbs_industrial_monthly_yoy_202607:'doc_nbs_export_industrial_202607',record_nbs_retail_monthly_yoy_202607:'doc_nbs_export_retail_monthly_202607',record_nbs_retail_ytd_yoy_202607:'doc_nbs_export_retail_ytd_202607'};
 Object.entries(supporting).forEach(([recordId,sourceId])=>{const record=window.MinshengDataRecords.find(item=>item.id===recordId);if(record)record.supportingSourceDocumentIds=[...new Set([...(record.supportingSourceDocumentIds||[]),sourceId])];});
})();

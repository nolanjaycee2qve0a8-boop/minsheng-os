/* Exact official header mappings only. New headers require manual mapping. */
window.MinshengNbsSeriesMappings=[
 ['社会消费品零售总额','CN.NBS.RETAIL_SALES.MONTHLY.LEVEL'],['社会消费品零售总额同比增长','CN.NBS.RETAIL_SALES.MONTHLY.YOY'],['社会消费品零售总额累计','CN.NBS.RETAIL_SALES.YTD.LEVEL'],['社会消费品零售总额累计同比增长','CN.NBS.RETAIL_SALES.YTD.YOY'],
 ['商品房销售面积','CN.NBS.PROPERTY_SALES_AREA.YTD.LEVEL'],['商品房销售面积同比增长','CN.NBS.PROPERTY_SALES_AREA.YTD.YOY'],['商品房销售额','CN.NBS.PROPERTY_SALES_VALUE.YTD.LEVEL'],['商品房销售额同比增长','CN.NBS.PROPERTY_SALES_VALUE.YTD.YOY'],
 ['民间固定资产投资','CN.NBS.PRIVATE_FAI.YTD.LEVEL'],['民间固定资产投资同比增长','CN.NBS.PRIVATE_FAI.YTD.YOY'],['规模以上工业增加值同比增长','CN.NBS.INDUSTRIAL_VALUE_ADDED.MONTHLY.YOY'],['规模以上工业增加值累计同比增长','CN.NBS.INDUSTRIAL_VALUE_ADDED.YTD.YOY']
].map(([sourceField,seriesId])=>({sourceId:'nbs',sourceField,seriesId,status:'VERIFIED'}));

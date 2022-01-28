//Script: Curso - Aplicabilidade do sensoriamento remoto para dados de precipitação
//Ministrantes: Dr. Marcos Santos e Ma. Milena Quaresma


/**********************DEFINIÇÃO DO INTERVALO DE TEMPO PARA ANALISE - ANO X E ANO X+1 *********/
Map.setOptions('SATELLITE')

var startyear = 1981;
var endyear = 2020;

// CRIAR LISTA PARA VARIÁVEL YEARS
var years = ee.List.sequence(startyear,endyear);
 
// CRIAR LISTA DE MESES PARA UTILIZAR NAS FUNÇÕES 
var months = ee.List.sequence(1,12);
 
// DEFINIR INÍCIO E FIM 
var startdate = ee.Date.fromYMD(startyear,1,1);
var enddate = ee.Date.fromYMD(endyear,12,31);

 
// DEFINIÇÃO DA ÁREA DE ESTUDO 
var area_estudo = ee.FeatureCollection('projects/milenasquaresma-marajo/assets/municipios_marajo')
                  

// DEFINIR A BORDA DO LAYER DAS ÁREAS DE ESTUDO
var empty = ee.Image().byte();
var outline = empty.paint({
  featureCollection: area_estudo,
  color: 1,
  width: 2
});
Map.addLayer(outline, {palette: '#000000'}, 'Área de Estudo',1);
Map.centerObject(area_estudo,7)

////////////////////////////COLEÇÃO DE IMAGEM PARA PRECIPITAÇÃO - SATÉLITE CHIRPS////// 1981 A 2020.....
var precipitation = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
                    .select('precipitation')
                    .filterDate(startdate, enddate)
                    .filterBounds(area_estudo);

/*******************************CALCULO DA PRECIPITAÇÃO ANUAL********************************/
var precipitacao_anual_acum = ee.ImageCollection.fromImages(//Retorna a coleção de imagens contendo as imagens fornecidas.
    years.map(function (year) {
    
    var anual = precipitation.filter(ee.Filter.calendarRange(year, year, 'year'))
        .sum() // acumula os dados anuais 
        .clip(area_estudo); //recorte para área de estudo
    return anual
        .set('year', year)
        .set('system:time_start', ee.Date.fromYMD(year, 1, 1))//apenas para termos uma data
        ;
}));

print('Coleção de imagens CHIRPS anual',precipitacao_anual_acum )
/******************************Gráfico precipitação anual************************************/
var chartP_anual = ui.Chart.image.seriesByRegion({
    imageCollection: precipitacao_anual_acum, //coleção
    regions: area_estudo,  //minha região e featureCollection
    reducer: ee.Reducer.mean(), //Redutores
    band: 'precipitation', //Banda em caso de existir mais de uma você poderá escolher
    scale: 2500, //Escala para gerar o gráfico
    xProperty: 'system:time_start',  //propriedade ex: index, date ou system:time_start
    seriesProperty: 'SIGLA_UF '}) //Propriedade da Feature (Label, Nome, NOME, classe...etc)
    .setOptions({ //opções para o gráfico
      title: 'Precipitação acumulada anual', //título
      hAxis: {title: 'Intervalo de tempo'}, //eixo horizontal
      vAxis: {title: 'P (mm)'}, //eixo vertical
      lineWidth: 1, //largura da linha
      pointSize: 5, //tamanho do ponto
      series: {
        0:  {color: 'blue'},//Cor 1
        1: {color: 'DeepSkyBlue'},//Cor 2 
        2: {color: 'SteelBlue'},// Cor 3
        3: {color: 'Green'} // Cor 4
          }}
      )
    .setChartType('ColumnChart');  //Estilo do gráfico tipos 'ScatterChart' e 'LineChart'...

print(chartP_anual) //imprimir o gráfico

/**************************************ADICIONANDO LAYERS*******************************/
var VisAnual = {opacity:1,
            bands:["precipitation"],
            min:1947,
            max:3618,
            palette:['cyan','darkblue','orange','Magenta','DarkMagenta','DeepPink']};

Map.addLayer(precipitacao_anual_acum, VisAnual, 'Precipitação Anual CHIRPS',1);

/*************************** CALCULO DA PRECIPITAÇÃO MENSAL **********************************/ 
var precipitacao_mensal_acum =  ee.ImageCollection.fromImages(
    
    years.map(function (y) {
    return months.map(function(m) {
    
      var precipitation_month = precipitation.filter(ee.Filter.calendarRange(y, y, 'year'))
                    .filter(ee.Filter.calendarRange(m, m, 'month'))
                    .sum()
                    .clip(area_estudo);
                    
      return precipitation_month.set('year', y)
              .set('month', m)
              .set('system:time_start', ee.Date.fromYMD(y, m, 1));//Ano, mês e dia =1
                        
    });
  }).flatten() //empilha a coleção ano a ano, mês a mês
              //Nivela coleções de coleções.
);

/***************************Precipitação Média Acumulada****************************/
var precipitacao_mensal_acum_mean =  ee.ImageCollection.fromImages(
  
  months.map(function (m) {
                             //Usa a coleção mensal acumulada
    var precipitation_month = precipitacao_mensal_acum.filter(ee.Filter.eq('month', m))
    .mean()
    .clip(area_estudo);
    
    return precipitation_month
            .set('month', m)
            .set('system:time_start',ee.Date.fromYMD(1, m, 1)); 
  }).flatten()
);

////////////////// FUNÇÃO PARA INSERIR GRÁFICO DE SÉRIES POR REGIÃO /////////////////////  
var chartP = ui.Chart.image.seriesByRegion({
    imageCollection: precipitacao_mensal_acum,//Coleção mensal 
    regions: area_estudo, 
    reducer: ee.Reducer.mean(), 
    band: 'precipitation', 
    scale: 2500, 
    xProperty: 'system:time_start', 
    seriesProperty: 'SIGLA_UF '})
    .setOptions({
      title: 'Precipitação mensal acumulada por município ao longo dos anos',
      hAxis: {title: 'Intervalo de tempo'},
      vAxis: {title: 'P (mm)'},
      lineWidth: 1,
      pointSize: 5,
      pointShape: 'square',
      series: {
          0:  {pointShape: 'circle',color: 'blue'},
          1: { pointShape: 'triangle', rotation: 180, color: 'DeepSkyBlue'},
          2: {pointShape: 'square' , color: 'SteelBlue'},
           3: {pointShape: 'square' , color: 'Green'}
          }}
      )
    .setChartType('ColumnChart');  

print(chartP)

/****************************Precipitação média mensal**********************************/
var chartMonthly = ui.Chart.image.seriesByRegion({
  imageCollection: precipitacao_mensal_acum_mean, 
  regions: area_estudo,
  reducer: ee.Reducer.mean(),
  band: 'precipitation',
  scale: 2500,
  xProperty: 'month',
  seriesProperty: 'SIGLA_UF '
}).setOptions({
      title: 'Precipitação média mensal acumulada por Município',
      hAxis: {title: 'Intervalo de tempo'},
      vAxis: {title: 'P (mm)'},
      lineWidth: 1,
      pointSize: 5,
      pointShape: 'square',
      series: {
         0:  {color: 'blue'},
          1: {color: 'DeepSkyBlue'},
          2: {color: 'SteelBlue'},
           3: {color: 'Green'}
          }}
      )
  .setChartType('ColumnChart');

print(chartMonthly);


/**************************************ADICIONANDO LAYERS*******************************/
var Vis = {opacity:1,
            bands:["precipitation"],
            min:32,
            max:294,
            palette:['red','orange','yellow','green','cyan','blue','darkblue']};

Map.addLayer(precipitacao_mensal_acum, Vis, 'Precipitação Mensal CHIRPS',1);


/*************************Criando uma tabela com os dados anuais******************/
var years = ee.List.sequence(1981, 2020)

var yearlyRainfall = function(year) {
      var startDate = ee.Date.fromYMD(year, 1, 1)
      //Crie uma nova data adicionando as unidades especificadas à data fornecida.
      var endDate = startDate.advance(1, 'year')
      
                    //minha coleção CHIRPS
      var filtered = precipitation.filter(ee.Filter.date(startDate, endDate))

      var stats = filtered.sum().reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: area_estudo,
        scale: 2500,
        })
        
        
      var funcao_tabela = ee.Feature(null, {
          'year': year,
          'precipitation': ee.Number(stats.get('precipitation')).format('%.2f')
          
          })
      
      return funcao_tabela
}

//Minha feature é uma lista de tempo
var rainfallYears = ee.FeatureCollection(years.map(yearlyRainfall))//uso a função para cada ano
print('Informações da Tabela',rainfallYears)

/*****************************Exportando a tabela**********************************/
Export.table.toDrive({
  collection: rainfallYears,
  folder: 'CURSO_PRECIPITACAO',
  description:'Tabela_precipitacao',
  selectors:['year','precipitation'],
  fileNamePrefix: 'Dados_Precipitacao_',
  fileFormat: 'CSV'}) 

/********************************Exportando Imagens em Loop***********************/
var years=ee.List.sequence(1981,2020).getInfo();
var month = ee.List.sequence(1,12).getInfo();

var serie_temporal = years.map(loop);//função para uma lista
                    
function loop(year){
                                    
        var startdate = ee.Date.fromYMD(year, 1, 1)
        var enddate = ee.Date.fromYMD(year, 12, 31)

/*****************************************Coleção*********************************/
var precipitation = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
                                      .select('precipitation')
                                      .filterDate(startdate, enddate)
                                      .filterBounds(area_estudo)
                
var precipitation_accum =  precipitation.reduce(ee.Reducer.sum()) //precipitation_sum
/*rename substituir o precipitatio_sum*/.rename('precipitation') 
                                        .clip(area_estudo)
                          

/**************************Adicionado Mapa de Precipitação por ano***********/
Map.addLayer(precipitation_accum, VisAnual, 'Precipitação Anual CHIRPS'.concat(year),0);    
/********************************Exportando Imagens Anual***********************/
Export.image.toDrive({
  image: precipitation_accum,
  folder: 'CURSO_PRECIPITACAO',
  description: 'CHIRPS'.concat(year),
  region: area_estudo,
  scale: 2500,
  maxPixels: 1e13
  })   
} //Fim da função Loop

/*************************Exportando Imagens Mensais***********************/
var size = precipitacao_mensal_acum.size() //contar quantas imagens tem
print('Quantas imagens existem:', size)

//Criando uma lista
var list = precipitacao_mensal_acum.toList(size)

// Definindo o intervalo e o download (lado do servidor)
      for(var i=1;i < 13;++i) //mes 1 ao 12
    {

//função de exportação onde foram definidos os seguintes parâmetros:
  var Name = ee.Image(list.get(i)).get('system:index').getInfo(); //nome da imagem
                  
  Export.image.toDrive({
    image:list.get(i), 
    description:'CHIRPS_mes_'+Name, 
    region: area_estudo,
    folder:'CURSO_PRECIPITACAO', //pasta criada no Google Drive onde serão salvas as imagens
    scale:2500, //
    maxPixels:1e13  //numero máximos de pixel que podem compor uma imagem. 1^13
  })

Map.addLayer(ee.Image(list.get(i)), Vis, 'Precipitação Média Mensal CHIRPS'.concat(Name),0)

}

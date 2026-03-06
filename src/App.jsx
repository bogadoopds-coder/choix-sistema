import { useState, useMemo, useEffect, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// ═══════════════════════════════════════════════════════════════════════════════
// CHOIX CONSTRUCTORA — SISTEMA INTEGRADO
// ═══════════════════════════════════════════════════════════════════════════════

// ─── BASE DE PRECIOS ──────────────────────────────────────────────────────────
const BASE_RAW = [["02.26.0248","ABRAZADERA aºiº 8mm a 12mm","UN",495.8],["02.26.0241","ACEITE cortadora pasto 100ml","LTS",1900.83],["02.42.0018","ACONDICIONAMIENTO TERMICO eq + mat + mo (presupuesto nro 1-0","GL",2030352.37],["02.41.0382","ACOPLE RAPIDO DE COMPRESION plástico 1/2' a 3/4'","UN",3066.12],["02.41.0187","ACOPLE RAPIDO plástico 1/2'","UN",1664.62],["02.41.0188","ACOPLE RAPIDO plástico 3/4'","UN",1443.8],["02.43.0088","ADAPTADOR DE TANQUE conexión 63mm (2 1/2') FF","UN",4130.88],["02.49.0203","ADAPTADOR VALVULA INODORO 38x40mm 'awaduct'","UN",1595.72],["02.04.0034","ADHESIVO impermeable para ceramico y revestimiento x30kg 'bi","KG",428.46],["02.04.0048","ADHESIVO para cerámica x10kg gris","KG",854.46],["02.04.0047","ADHESIVO para ceramica x25kg 'sinteplast''","KG",480.0],["02.04.0040","ADHESIVO para cerámica x25kg gris ''weber''","KG",335.41],["02.04.0003","ADHESIVO para cerámica x30kg basic ''weber''","KG",311.83],["02.04.0035","ADHESIVO para cerámica x30kg gris ''weber''","KG",454.55],["02.04.0016","ADHESIVO para pvc x250cm3","UN",9319.68],["02.04.0042","ADHESIVO/SELLADOR de silicona neutro transparente x 280cc 'r","UN",39669.44],["02.42.0019","AIRE ACONDICIONADO SPLIT frio/calor 2250frig/2600w","UN",608519.44],["02.42.0021","AIRE ACONDICIONADO SPLIT frio/calor 2800frig/3000w","UN",589835.51],["02.42.0011","AIRE ACONDICIONADO SPLIT frio/calor 2800frig/3300w","UN",564828.55],["02.42.0020","AIRE ACONDICIONADO SPLIT frio/calor 4500frig/5300w","UN",879296.84],["02.42.0012","AIRE ACONDICIONADO SPLIT frio/calor 5500-6000frig/6200w","UN",1106892.29],["02.06.0012","AISLANTE ESPUMA de polietileno +ALUMINIO DE UN LADO 10mm - 1","M2",1699.5],["02.06.0052","AISLANTE HIDRAULICO FILM POLIETILENO color: negro/100 mc/2mx","M2",740.02],["02.06.0023","AISLANTE HIDRAULICO FILM POLIETILENO color: negro/100 mc/2mx","M2",360.0],["02.06.0031","AISLANTE HIDRAULICO FILM POLIETILENO color: negro/150 mc/4mx","M2",270.0],["02.06.0007","AISLANTE HIDRAULICO FILM POLIETILENO color: negro/200 mc/2mx","M2",290.0],["02.06.0019","AISLANTE HIDRAULICO FILM POLIETILENO color: negro/200 mc/4mx","M2",315.0],["02.37.0001","AJUSTE POR REDONDEO","UN",0.01],["02.02.0061","ALAMBRE GALVANIZADO liso C16 xkg","KG",4293.81],["02.02.0128","ALAMBRE GALVANIZADO liso C8 xkg","KG",2983.47],["02.02.0099","ALAMBRE negro recocido C14 xkg","KG",5023.31],["02.02.0045","ALAMBRE negro recocido C16 xkg","KG",3100.0],["02.02.0114","ALAMBRE negro recocido C6 xkg","KG",3022.9],["02.02.0019","ALAMBRE negro recocido C8 xkg","KG",3600.0],["02.25.0002","ALQUILER auto elevador x hora","UN",900000.0],["02.24.0032","ALQUILER maquinaria","UN",1072008.02],["02.43.0511","ARANDELA GOMA p/flexible de 1/2'","UN",38.02],["02.43.0509","ARANDELA GOMA p/flexible de 3/4'","UN",47.52],["02.43.0502","ARANDELA PVC sujeta tapa 'ideal'","UN",467.95],["02.14.0040","ARENA FINA bolson xm3","M3",29500.0],["02.14.0041","ARENA FINA granel xm3","M3",30093.21],["02.43.0287","ARO DESPLAZADOR conexion goma p/inodoro desagote 20mm/despla","UN",1177.95],["02.41.0387","ARO/JUNTA DE GOMA de apoyo p/mochila 105mm","UN",1606.18],["02.41.0324","ARO/JUNTA DE GOMA p/base de inodoro","UN",1807.27],["02.17.0020","ARTEFACTO ILUMINACION APLICAR circular/led/diam 230mm","UN",4807.74],["02.16.0028","ARTEFACTO ILUMINACION APLICAR circular/tortuga/led diam 90mm","UN",14185.1],["02.17.0019","ARTEFACTO ILUMINACION APLICAR cuadrado/led 300x300mm/24w/luz","UN",15000.0],["02.17.0006","ARTEFACTO ILUMINACION APLICAR cuadrado/led 600x600mm/1x60w/l","UN",37000.0],["02.17.0047","ARTEFACTO ILUMINACION APLICAR plafon redondo/led 170mm/altur","UN",4807.74],["02.16.0025","ARTEFACTO ILUMINACION APLICAR tortuga diam 280mm ovalada/ext","UN",13839.12],["02.17.0027","ARTEFACTO ILUMINACION APLICAR tortuga diam 300mm","UN",41800.0],["02.17.0051","ARTEFACTO ILUMINACION EMBUTIR plafon doble con louver/2 tubo","UN",7514.13],["02.30.0029","ASESORAMIENTO contra incendio / Obra: Ensenada","GL",500000.0],["02.30.0031","ASESORAMIENTO contra incendio / Obra: Gral Rodriguez","GL",387400.0],["02.30.0027","ASESORAMIENTO contra incendio / Obra: Merlo","UN",387400.0],["02.43.0292","ASIENTO Y TAPA P/INODORO (baño discapacitado) mdf laqueda/co","UN",40721.94],["02.43.0293","ASIENTO Y TAPA P/INODORO (baño discapacitado) mdf laqueda/co","UN",40721.94],["02.43.0291","ASIENTO Y TAPA P/INODORO plastica universal","UN",16426.45],["02.43.0298","ASIENTO Y TAPA P/INODORO plastico","UN",20763.91],["02.43.0299","ASIENTO Y TAPA P/INODORO plastico 'cordenons'","UN",20763.91],["02.26.0032","BALDE ALBAÑIL plástico 8lts","UN",1759.6],["02.38.0095","BALDOSA cemento liso 0,60x0,40mts","M2",19008.27],["10.30.0001","BALIZA REGLAMENTARIA para matafuegos ''A'' o ''ABC''","UN",5000.0],["02.19.0029","BANCO / Obra: La Plata","UN",129245.66],["02.33.0043","BAÑO QUIMICO CON DUCHA (incluye flete/2 limpiezas semanales)","UN",347100.0],["02.33.0048","BAÑO QUIMICO estandar (sin flete/1 limpieza semanal) zona La","UN",70000.0],["02.33.0044","BAÑO QUIMICO s/ducha (incluye flete/2 limpiezas semanales) z","UN",16166.33],["02.43.0400","BARRAL FIJO 75cm (baño discapacitado) ''cordenons''","UN",34691.57],["02.43.0398","BARRAL REBATIBLE 70cm c/ portarollo (baño discapacitado) ''c","UN",45665.43],["02.43.0592","BARRAL REBATIBLE 80cm c/ portarrollo (baño discapacitado) ''","UN",45665.43],["02.30.0025","BATERIA ALARMA kaiser 12v7a/ Obra: Pilar","UN",34300.0],["02.19.0027","BEBEDERO (Tipo AYC)/ Obra: CABA","UN",3375000.0],["02.27.0019","BISAGRA munición hierro reforzada (apta soldar) 75x75x2.5mm ","UN",1638.85],["02.27.0026","BISAGRA munición hierro reforzada (soldable) perno: 14mm/pla","UN",2054.3],["02.14.0055","BLOQUE DE Hº liso 19x19x39cm","UN",1422.31],["02.26.0205","BOCALLAVE tubo encastre 3/8' hexagonal 9mm","UN",1572.72],["02.19.0031","BOLARDO / Obra: La Plata","UN",17327.04],["02.14.0033","BOLSON materiales de corralon","UN",6500.0],["02.41.0402","BOMBA CENTRIFUGA monofasica c/motor: 1hp/elevacion de agua c","UN",158383.68],["02.41.0403","BOMBA CENTRIFUGA monofasica c/motor: 3/4hp/elevacion de agua","UN",144831.62],["02.54.0034","BOQUETA de desague c/solapes de agarre (reduccion de 100 a 8","UN",20000.0],["02.16.0580","BORNERA FIJA tripolar 60A /modelo T3-60","UN",5141.46],["02.16.0617","BORNERA FIJA unipolar 200A /modelo T1-200","UN",4500.0],["02.16.0272","BORNERA PUESTA A TIERRA 16mm verde/amarillo","UN",10500.0],["02.08.0012","BOTIQUIN primero auxilios , tipo A o B","UN",38000.0],["02.43.0512","BOYA telgopor 2 roscas p/flotante","UN",1874.33],["02.43.0250","BOYA UNIVERSAL DESCARGA p/deposito embutido","UN",4246.58],["02.14.0061","BREA EN PAN x10kg","KG",937.48],["02.14.0015","BREA EN PAN x20kg","KG",2768.55],["10.14.0006","BREA EN PAN x30kg","KG",902.27],["02.29.0107","BROCA ANCLAJE perno hormigon fwa 12x80mm 'fischer'","UN",1712.0],["02.02.0190","BROCA ANCLAJE taco metalico expansion 12mm fw12x120 'fisher'","UN",4200.0],["02.43.0501","BUJE de bronce c/rosca de reduccion 50x40mm 'alarsa'","UN",6360.1],["02.41.0362","BUJE PP de reduccion 3/4' a 1/2'","UN",124.05],["02.43.0575","BUJE PP H de reduccion c/rosca 1 1/2'x1 1/4'","UN",409.5],["02.43.0054","BUJE PPTF de reduccion 25x20mm 'tubo fusion'","UN",220.42],["02.43.0021","BUJE PPTF de reduccion 32x20mm 'tubo fusion'","UN",292.84],["02.43.0006","BUJE PPTF de reduccion 32x25mm 'tubo fusion'","UN",292.84],["02.43.0020","BUJE PPTF de reduccion 40x32mm 'tubo fusion'","UN",529.36],["02.43.0053","BUJE PPTF de reduccion 50x32mm","UN",850.17],["02.43.0522","BUJE PPTF de reduccion 50x32mm 'tubo fusion'","UN",850.17],["02.43.0204","BUJE PPTF de reduccion 50x40mm 'tubo fusion'","UN",1360.74],["02.43.0123","BUJE PPTF de reduccion 63x40mm","UN",1448.43],["02.43.0523","BUJE PPTF de reduccion 63x50mm 'tubo fusion'","UN",1819.29],["02.49.0126","BUJE REDUCCION/REDUCTOR excentrico anular 110x63 ''duratop''","UN",2689.22],["02.49.0163","BUJE REDUCCION/REDUCTOR excentrico anular 50x40 ''duratop''","UN",1138.91],["02.27.0030","CADENA n55 zincada x kg","KG",5783.07],["02.27.0031","CADENA n70 zincada x kg","KG",5783.07],["02.16.0035","CAJA DE INSPECCION p/jabalina","UN",1205.38],["02.16.0418","CAJA DE PASO de chapa de 20 x 20 x 10cm","UN",5140.0],["02.16.0579","CAJA DE PASO pvc estanca 165x210x800mm","UN",4986.64],["02.16.0585","CAJA DE PASO pvc estanca 210x210x110mm","UN",5937.51],["02.16.0541","CAJA DE PASO pvc estanca 210x310x110mm","UN",13308.85],["02.16.0574","CAJA MEDIDOR monofasica c/reseteo 'genrod'","UN",9289.82],["02.16.0590","CAJA MEDIDOR trifasica c/reseteo 'genrod'","UN",16906.74],["02.16.0021","CAJA OCTOGONAL 8x8x5cm hierro galv/ch20","UN",250.0],["02.16.0212","CAJA PLASTICA pvc de embutir 5x5cm","UN",500.0],["02.16.0578","CAJA PVC p/pilar 2bip/IP65","UN",9325.74],["02.16.0112","CAJA RECTANGULAR alta exterior 'kalop'","UN",1160.0],["02.16.0020","CAJA RECTANGULAR embutir/10cmx5cm hierro galv/ch20","UN",250.0],["02.16.0571","CAJA TOMA 200A con 3 bases NH (modelo: Edelap) 'genrod'","UN",129306.27],["02.16.0598","CAJA TOMA 63A con 3 base (modelo: Edesur)","UN",65000.0],["02.14.0007","CAL aerea x 25kg ''avellaneda''","KG",148.53],["02.14.0026","CAL aerea x 25kg ''milagro''","KG",478.31],["02.14.0042","CAL hidraulica/comun cacique x 30kg ''loma negra''","KG",221.67],["02.14.0065","CAL hidraulica/comun x 25kg ''cementos avellaneda''","UN",3916800.0],["02.17.0033","CALOVENTOR eléctrico portátil 2000w","UN",7933.06],["02.27.0024","CANDADO de hierro 50mm","UN",5307.98],["02.43.0357","CANILLA ESFERICA P/MANG. 1/2","UN",7603.89],["02.43.0358","CANILLA ESFERICA P/MANG. 3/4","UN",11856.94],["02.43.0594","CANILLA ESFERICA P/MANG. 3/4 'valforte'","UN",11753.84],["02.43.0352","CANILLA p/lavatorio pico curvo","UN",13170.26],["02.43.0600","CANILLA p/lavatorio pico levantado 'valforte'","UN",13531.46],["02.43.0573","CANILLA p/lavatorio plastico","UN",3169.03],["02.49.0187","CAÑO CAMARA pvc diam 110 c/tapa de acceso roscado 'tuboforte","UN",3895.56],["02.16.0575","CAÑO PILAR doble aisl.c/curva 1 1/2'x3000mm","UN",19785.62],["02.01.0186","CARPINTERIA CEA3 Ventanas Aula en pasillo, ancho 0,50m OBRA:","UN",385000.0],["02.01.0187","CARPINTERIA CIMA1 Puerta en aula, ancho 1,30m OBRA: PILAR","UN",1389000.0],["02.08.0019","CARTEL CORRUGADO 50x70 (cerrado al transito)","UN",6500.0],["02.08.0034","CARTEL CORRUGADO 50x70 (desvio derecha)","UN",6500.0],["02.08.0033","CARTEL CORRUGADO 50x70 (desvio izquierda)","UN",6500.0],["02.08.0037","CARTEL CORRUGADO 50x70 (hombres trabajando)","UN",7065.0],["02.10.0026","CARTEL CORRUGADO 50x70 (mantenga orden y limpieza)","UN",4800.0],["02.10.0024","CARTEL CORRUGADO 50x70 (maquinas trabajando)","UN",7065.0],["02.08.0020","CARTEL CORRUGADO 50x70 (no avanzar)","UN",6500.0],["02.08.0039","CARTEL CORRUGADO 50x70 (obra en construccion)","UN",6500.0],["02.08.0018","CARTEL CORRUGADO 50x70 (peatón circule con precaución)","UN",7065.0],["02.10.0033","CARTEL CORRUGADO 50x70 (precaucion entrada y salida de camio","UN",7065.0],["02.10.0027","CARTEL CORRUGADO 50x70 (prohibido el paso a toda persona aje","UN",4800.0],["02.10.0023","CARTEL CORRUGADO 50x70 (uso obligatorio de casco, calzado de","UN",4800.0],["02.10.0022","CARTEL CORRUGADO 50x70 (uso obligatorio de epp)","UN",3694.22],["02.10.0038","CARTELERIA Y SEÑALETICA obra: CABA","UN",27818.18],["02.35.0004","CARTON CORRUGADO rollo 0.90mtsx25mts","M2",338.92],["02.35.0048","CARTON CORRUGADO rollo 1.00mtsx30mts","M2",309.48],["02.08.0007","CASCO para obra color: blanco/mod: mapuche 'fravida'","UN",6682.5],["02.14.0029","CASCOTE picado bolson xm3","M3",22716.22],["02.14.0060","CEMENTO blanco x10kg","KG",1932.0],["02.14.0076","CEMENTO blanco x1kg","KG",1932.2],["02.14.0079","CEMENTO x 10kg (comun","KG",1203.31],["02.14.0084","CEMENTO x 25kg (comun) ''loma negra''","KG",240.0],["02.14.0001","CEMENTO x 50kg (comun) ''avellaneda''","KG",165.97],["02.14.0078","CEMENTO x 50kg (comun) ''holcim''","KG",153.72],["02.14.0008","CEMENTO x 50kg (comun) ''loma negra''","KG",240.0],["02.30.0020","CENTRAL DE INCENDIO RAVEL RE54-R 4zonas c/gabinete metalico,","UN",570248.0],["02.38.0109","CERAMICO 20x20cm color: blanco/acabado: mate","M2",5926.46],["02.38.0020","CERAMICO 33x33cm color: varios/acabado:satinado/ textura:ant","M2",32318.91],["02.38.0017","CERAMICO 35x35cm color: blanco plus ''lourdes''","M2",5992.64],["02.38.0065","CERAMICO 35x35cm color: gris victoria ''lourdes''","M2",43317.71],["02.38.0108","CERAMICO 38x38cm color: neve/acabado: brillante","M2",4994.38],["02.11.0021","CERCO PERIMETRAL alambre tejido romboidal galvanizado, calib","GL",920000.0],["10.27.0004","CERRADURA doble perno seguridad ''trabex''","UN",17180.99],["02.19.0026","CESTO (Topo Nomen)/ Obra: CABA","UN",1052250.0],["02.12.0039","CHAPA LISA galvanizada C26 1mtsx2mts","M2",7203.69],["02.12.0004","CHAPA SINUSOIDAL cincalum C25 xmt","M2",9532.45],["02.12.0002","CHAPA SINUSOIDAL/ACANALADA aluminizada C25 1,086x1ml (ancho ","M2",13812.15],["02.12.0006","CHAPA SINUSOIDAL/ACANALADA plastica 1.2mm xmt","M2",21212.12],["02.16.0552","CINTA AISLADORA PVC x10mts color: negro","UN",725.08],["02.16.0606","CINTA AISLADORA PVC x18mts color: negro","UN",2966.0],["02.16.0363","CINTA AISLADORA PVC x20mts color: blanco","UN",1137.75],["02.16.0362","CINTA AISLADORA PVC x20mts color: negro","UN",1221.49],["02.16.0582","CINTA DE CAUCHO AUTOSALDABLE (rollo) 19mmx4.57mtsx0.76mm alt","UN",2400.0],["02.31.0032","CINTA DE PAPEL 24mmx150mts","UN",6706.7],["02.35.0026","CINTA DE PAPEL 24mmx50mts","UN",1640.46],["02.35.0210","CINTA DE PAPEL 36mmx40mts","UN",2580.48],["02.35.0224","CINTA DE PAPEL 48mmx40mts","UN",6538.98],["02.35.0025","CINTA DE PAPEL 48mmx50mts","UN",7143.28],["02.13.0010","CINTA DE PAPEL microperforada 50mm/rollo x 150mts 'knauf'","UN",6706.7],["02.13.0069","CINTA DE PAPEL microperforada 50mm/rollo x 35mts","UN",1812.32],["02.35.0194","CINTA DE PAPEL PINTOR AZUL premium/uv 36mmx40mts","UN",3435.37],["02.35.0008","CINTA DE PAPEL PINTOR AZUL premium/uv 48mmx40mts","UN",5647.39],["02.26.0025","CINTA DE PELIGRO 8cm leyenda: seguridad/ x200mts","UN",4747.5],["02.26.0192","CINTA EMBALAR/EMPAQUE adhesiva 48mm","UN",1520.65],["02.24.0045","CINTA METRICA 20mts","UN",27500.0],["02.24.0044","CINTA METRICA 8mts","UN",6207.46],["02.49.0063","CINTA PERFORADA GALVANIZADA 17mmx30mts","UN",21169.2],["02.13.0074","CINTA TRAMADA autoadhesiva 5cmx45mts","UN",3185.86],["02.13.0025","CINTA TRAMADA autoadhesiva 5cmx90mts","UN",5800.0],["02.01.0214","CLARABOYA para techo de losa de 80x80cm","UN",209917.36],["02.14.0067","CLAVO cabeza perdida 10x50mm xkg","KG",8334.71],["10.02.0021","CLAVO PARAGUA 2 1/2'' con arandela de goma","KG",22000.0],["10.14.0014","CLAVO punta paris 1 1/2''","KG",4740.8],["02.14.0039","CLAVO punta paris 2 1/2''","KG",2533.06],["02.14.0038","CLAVO punta paris 2''","KG",3579.34],["02.26.0070","CLORO LIQUIDO x lts","LTS",1215.68],["02.26.0235","COBERTOR plastico 3x5mt","UN",3331.7],["02.49.0121","CODO a 45º Ø110 H-H ''duratop''","UN",2953.24],["02.49.0134","CODO a 45º Ø110 M-H ''duratop''","UN",2234.23],["02.49.0041","CODO a 45º Ø40 M-H ''duratop''","UN",668.17],["02.48.0041","CODO a 45º Ø40 M-M ''duratop''","UN",679.34],["02.49.0136","CODO a 45º Ø50 M-H ''duratop''","UN",972.56],["02.48.0042","CODO a 45º Ø63 M-M ''duratop''","UN",1208.02],["02.50.0179","CODO a 90° con rosca H 20mm x 1/2' 'sigas'","UN",1399.46],["02.49.0153","CODO a 90° Ø110 c/base M-H 'duratop'","UN",3771.24],["02.41.0039","CODO a 90º FF Ø20 x 1/2' rosca H 'tubo fusion'","UN",174.94],["02.49.0152","CODO a 90º Ø110 H-H ''duratop''","UN",3171.23],["02.49.0120","CODO a 90º Ø110 M-H ''duratop''","UN",2381.26],["02.49.0182","CODO a 90º Ø40 H-H ''duratop''","UN",704.57],["02.49.0017","CODO a 90º Ø40 M-H ''awaduct''","UN",358.8],["02.49.0040","CODO a 90º Ø40 M-H ''duratop''","UN",681.39],["02.49.0135","CODO a 90º Ø50 M-H ''duratop''","UN",972.56],["02.49.0151","CODO a 90º Ø63 H-H ''duratop''","UN",1631.48],["02.48.0043","CODO a 90º Ø63 M-M ''duratop''","UN",1469.9],["02.43.0430","CODO ESPIGA 3/4' polietileno c/ rosca H","UN",322.25],["02.43.0499","CODO ESPIGA DOBLE conexion 3/4' polietileno","UN",249.39],["02.43.0019","CODO PPTF 90º 32mm (1 1/4') ''aqcua system''","UN",425.09],["02.43.0552","CODO PPTF 90º 40mm (1 1/2') 'tubo fusion'","UN",906.85],["02.43.0524","CODO PPTF 90º 63mm''tubo fusion''","UN",3302.72],["02.43.0071","CODO PPTF 90º RH 20mm x1/2 'acqua system'","UN",1399.46],["02.43.0458","CODO PPTF 90º RH 20mm x1/2 'tubo fusion'","UN",1399.46],["02.43.0553","CODO PPTF 90º RH 25mm x1/2 'tubo fusion'","UN",1731.82],["02.43.0554","CODO PPTF 90º RH 25mm x3/4 'tubo fusion'","UN",1763.31],["02.43.0087","CODO PPTF 90º RM 20mm x1/2 'acqua system'","UN",2007.91],["02.43.0094","CODO PPTF a 90º Ø20 'tubo fusion'","UN",174.94],["02.43.0017","CODO PPTF a 90º Ø25 'tubo fusion'","UN",274.64],["02.43.0444","CODO PPTF a 90º Ø32 'tubo fusion'","UN",472.32],["02.43.0445","CODO PPTF a 90º Ø40 'tubo fusion'","UN",1051.42],["02.43.0446","CODO PPTF a 90º Ø50 'tubo fusion'","UN",1734.96],["02.43.0447","CODO PPTF a 90º Ø63 'tubo fusion'","UN",3446.32],["02.16.0045","CONECTOR PVC CURVABLE p/caño 20mm color: gris","UN",110.25],["02.16.0210","CONECTOR PVC p/caño 20mm","UN",125.0],["02.16.0211","CONECTOR PVC p/caño 25mm","UN",270.0],["02.16.0478","CONECTOR PVC p/caño 32mm","UN",628.0],["02.16.0562","CONECTOR PVC p/caño 40mm","UN",785.0],["02.43.0301","CONEXION DESPLAZADOR p/inodoro de 55mm a 100mm","UN",5242.56],["02.16.0367","CONMUTADOR interruptor/3polos 1-0-2 20 amp ''elibet''","UN",22000.0],["02.16.0620","CONTACTOR tripolar 18amp - 220V","UN",90000.0],["02.16.0619","CONTACTOR tripolar 18amp - 24V","UN",90000.0],["02.33.0034","CONTENEDOR OFICINA s/baño 6,00x2,30mts equipada c/split (alq","UN",393000.0],["02.33.0042","CONTENEDOR OFICINA s/baño, equipado c/ split 6,00x2,40mts (a","UN",539664.0],["02.33.0041","CONTENEDOR PARA PAÑOL/VESTUARIO 4.3m x 2,3m (alquiler x mes)","UN",324903.0],["02.02.0110","CORTE piezas a medida x unidad","UN",599853.4],["02.48.0044","CUPLA 110 H-H 'duratop'","UN",2869.97],["02.48.0046","CUPLA 40 H-H 'duratop'","UN",993.95],["02.48.0045","CUPLA 63 H-H 'duratop'","UN",1412.89],["02.49.0170","CUPLA de reduccion 110x63 M-H 'duratop'","UN",2236.28],["02.43.0558","CUPLA HH 1/2'' 'tg plast'","UN",161.26],["02.16.0479","CUPLA PVC 32mm","UN",363.78],["02.49.0207","CUPLA PVC HH 50mm","UN",370.86],["02.16.0207","CUPLA PVC rigido 20mm","UN",95.0],["02.16.0208","CUPLA PVC rigido 25mm","UN",135.0],["02.16.0557","CUPLA PVC rigido 32mm","UN",327.0],["02.16.0556","CUPLA PVC rigido 40mm","UN",393.0],["02.43.0438","CUPLA reduccion 3/4' a 1/2' polipropileno","UN",263.51],["02.43.0528","CUPLA rosca H 20x1/2' 'tubo fusion'","UN",1405.54],["02.43.0603","CUPLA rosca M 20x1/2' 'tubo fusion'","UN",1752.36],["02.43.0543","CUPLA rosca M 25x3/4' 'tubo fusion'","UN",2169.15],["02.43.0531","CUPLA rosca M 32x1' 'tubo fusion'","UN",4636.45],["02.43.0529","CUPLA rosca M 40x1 1/4' 'tubo fusion'","UN",8571.65],["02.43.0530","CUPLA rosca M 63x2' 'tubo fusion'","UN",18399.78],["02.41.0327","CUPLA UNION NORMAL PPTF 20mm 'acqua system'","UN",142.38],["02.43.0555","CUPLA UNION NORMAL PPTF 20mm FF","UN",136.45],["02.41.0009","CUPLA UNION NORMAL PPTF 32mm 'acqua system'","UN",324.92],["02.43.0452","CUPLA UNION PPTF 20mm 'tubo fusion'","UN",122.81],["02.43.0453","CUPLA UNION PPTF 25mm 'tubo fusion'","UN",220.42],["02.43.0454","CUPLA UNION PPTF 32mm 'tubo fusion'","UN",311.39],["02.43.0455","CUPLA UNION PPTF 40mm 'tubo fusion'","UN",529.0],["02.43.0456","CUPLA UNION PPTF 50mm 'tubo fusion'","UN",1054.85],["02.49.0188","CURVA a 45° Ø110 M-H 'tuboforte'","UN",3000.63],["02.16.0445","CURVA PVC 1'' color: blanco/pvc p/ tubo rigido","UN",484.0],["02.16.0012","CURVA PVC 20mm 3/4'' blanca","UN",281.0],["02.16.0245","CURVA PVC 25mm 1'' blanca","UN",360.0],["02.16.0480","CURVA PVC 32mm 1 1/4'","UN",840.0],["02.16.0275","CURVA PVC 40mm 1 1/2'","UN",1053.15],["02.49.0191","CURVA PVC a 45° Ø63 M-H","UN",859.35],["02.49.0213","CURVA PVC a 90° Ø50 M-H","UN",724.76],["02.26.0240","CUTTER profesional","UN",11570.25],["02.43.0601","DEPOSITO INODORO de apoyar 'deca'","UN",113055.92],["02.43.0303","DEPOSITO INODORO de apoyar/linea diamante 'cordenons'","UN",73311.75],["02.43.0306","DEPOSITO INODORO de colgar/linea diamante ''cordenons''","UN",73323.28],["02.43.0308","DEPOSITO INODORO de colgar/linea integral (baño discapacitad","UN",73323.28],["02.41.0335","DEPOSITO PLASTICO boton lateral/12 a 14lts mochila pvc","UN",44828.1],["02.41.0391","DEPOSITO PLASTICO de colgar 11lts","UN",28365.43],["02.41.0383","DEPOSITO PLASTICO de colgar c/flexible 'ideal'","UN",18499.02],["02.41.0097","DEPOSITO PLASTICO de colgar c/flexible 'tigre'","UN",15092.59],["02.41.0185","DESAGUE SOPAPA plastica pileta bacha apoyo p/pegar c/ rejill","UN",2198.96],["02.41.0178","DESCARGA CORRUGADA LAVATORIO diam 40 PVC","UN",2338.35],["02.41.0242","DESCARGA CORRUGADA LAVATORIO diam 50 PVC","UN",2440.02],["02.26.0222","DESTAPA CAÑERIA x1kg","KG",3335.77],["02.30.0021","DETECTOR DE HUMO 701P 2 hilos certificado en 54 y por LPCB/ ","UN",31720.0],["02.43.0507","DIAFRAGMA p/valvula entrada de agua","UN",92.18],["02.35.0137","DILUYENTE AGUARRAS x18lts hydrarras ''hydra''","LTS",3863.89],["02.35.0005","DILUYENTE AGUARRAS x18lts sinterras ''sinteplast''","LTS",1538.25],["02.35.0204","DILUYENTE AGUARRAS x1lts","LTS",3446.41],["02.35.0006","DILUYENTE AGUARRAS x4lts tersirras ''tersuave''","LTS",3725.0],["02.35.0205","DILUYENTE AGUARRAS x5lts","LTS",3017.54],["02.36.0002","DILUYENTE THINNER x 18lts universal standard ''sinteplast''","LTS",2469.16],["02.35.0167","DILUYENTE THINNER x 1lts universal","LTS",4082.64],["02.35.0165","DILUYENTE THINNER x 4lts universal standard ''llana''","LTS",2655.58],["02.35.0080","DILUYENTE THINNER x 4lts universal standard ''sinteplast''","LTS",3929.52],["02.26.0028","DISCO DE ASERRADO 14'' pavimento","UN",399998.0],["02.26.0246","DISCO DE CORTE acero 14' 350x2,5x25,4 ''tyrolit''","UN",13061.85],["02.26.0030","DISCO DE CORTE hierro 9'","UN",5565.64],["02.26.0094","DISCO DE CORTE metal 14'","UN",8000.0],["02.26.0053","DISCO DE CORTE metal 4'","UN",902.89],["02.26.0237","DISCO DE CORTE plano 7' 178x1,6x22 'norton'","UN",3028.41],["02.26.0026","DISCO DE CORTE plano 7' 178x1,6x22 ''tyrolit''","UN",4200.0],["02.26.0247","DISCO DE DESBASTE acero 4 1/2' 115x6,0x22,23 'tyrolit'","UN",7362.46],["02.26.0213","DISCO DE WIDIA DE 4'","UN",6126.88],["02.26.0115","DISCO DE WIDIA DE 7'","UN",25000.0],["02.26.0117","DISCO DE WIDIA DE 9'","UN",26000.0],["02.26.0150","DISCO DESBASTE COPA diamantado hormigon/doble astra 115mm","UN",13000.0],["02.26.0244","DISCO DIAMANTADO CONTINUO 4 1/2' azulejos/ceramicas/marmol/p","UN",18409.8],["02.26.0238","DISCO DIAMANTADO CONTINUO 4' azulejos/ceramicas/marmol/porce","UN",5180.77],["02.26.0260","DISCO DIAMANTADO CONTINUO 9' azulejos/ceramicas/marmol/porce","UN",20020.66],["02.26.0154","DISCO DIAMANTADO MUELA DESBASTE 4' concreto 100mm","UN",14998.0],["02.26.0261","DISCO DIAMANTADO TURBO 9'","UN",19964.46],["02.26.0233","DISCO FLAP 4 1/2' (115mm) metal/madera/grano 40","UN",2271.92],["02.26.0054","DISCO SEGMENTADO DIAMANTADO 7' concreto/ladrillo/bloque","UN",12000.0],["02.26.0031","DISCO SEGMENTADO DIAMANTADO 9' concreto/ladrillo/bloque","UN",21162.81],["02.16.0607","DISTRIBUIDOR BORNERA tetrapolar 4x15 (contactos) 160A","UN",129000.0],["02.16.0164","DISYUNTOR/INTERRUPTOR diferencial 2x25amp (bipolar automatic","UN",60000.0],["02.16.0469","DISYUNTOR/INTERRUPTOR diferencial 2x40amp (bipolar automatic","UN",18258.7],["02.16.0173","DISYUNTOR/INTERRUPTOR diferencial 2x40amp (bipolar automatic","UN",112351.0],["02.16.0144","DISYUNTOR/INTERRUPTOR diferencial 4X25amp/sensibilidad 30ma ","UN",89000.0],["02.16.0157","DISYUNTOR/INTERRUPTOR diferencial 4x40amp (tetrapolar automa","UN",15580.52],["02.16.0627","DISYUNTOR/INTERRUPTOR diferencial 4X40amp/sensibilidad 30ma ","UN",96000.0],["02.16.0082","DISYUNTOR/INTERRUPTOR diferencial 4x63amp (tetrapolar automa","UN",49964.02],["02.41.0055","DUCHA ELECTRICA 5500w para 220V 'lorenzetti'","UN",40350.61],["02.02.0060","ELECTRODOS 2,5mm","KG",10500.0],["02.49.0065","EMBUDO desague pluvial vertical Ø110 20x20cm/reja plastica '","UN",9770.9],["02.49.0186","EMBUDO desague pluvial vertical Ø110 reja plastica 'tubofort","UN",3372.43],["02.49.0175","EMPALME de acceso horizontal c/entradas 63-50 y salidas 63 '","UN",6131.71],["02.35.0216","ENDUIDO EXTERIOR mate blanco x 1lt","LTS",4004.0],["02.35.0068","ENDUIDO EXTERIOR mate blanco x20lt ''casablanca''","LTS",1698.08],["02.35.0010","ENDUIDO INTERIOR mate blanco x20lt ''casablanca''","LTS",1302.6],["02.35.0162","ENDUIDO INTERIOR mate blanco x20lt ''tersuave''","LTS",1238.64],["02.43.0038","ENTREROSCA/NIPLE 1' polipropileno","UN",258.89],["02.43.0416","ENTREROSCA/NIPLE 1/2' polipropileno","UN",2392.32],["02.22.0030","ESCRITORIO con 2 cajones","UN",110000.0],["02.26.0022","ESMALTE AEROSOL color: rojo x240cm3 'kuwait''","UN",6198.35],["02.35.0089","ESMALTE epoxi color: blanco/acabado: brillante x1lts 'sintep","LTS",1217.42],["02.35.0125","ESMALTE SINTETICO color: gris hielo -029 /acabado: satinado ","LTS",8918.17],["02.35.0198","ESMALTE SINTETICO color: gris hielo x20lts","LTS",10958.4],["02.35.0197","ESMALTE SINTETICO color: gris oscuro x20lts","LTS",10249.31],["02.35.0091","ESMALTE SINTETICO 2 en 1 doble accion 650/color: blanco x4lt","LTS",17500.0],["02.35.0222","ESMALTE SINTETICO 2 en 1 doble accion color: bermellon/acaba","LTS",6680.58],["02.35.0223","ESMALTE SINTETICO 2 en 1 doble accion color: sw1313/acabado:","LTS",11128.59],["02.35.0132","ESMALTE SINTETICO 2 en 1 doble accion/color: blanco/acabado:","LTS",10330.58],["02.35.0213","ESMALTE SINTETICO 3 en 1 convertidor/antioxido color: amaril","LTS",6680.58],["02.35.0019","ESMALTE SINTETICO 3 en 1 convertidor/antioxido color: negro ","LTS",9391.18],["02.35.0187","ESMALTE SINTETICO 3 en 1 convertidor/antioxido color: negro/","LTS",5749.56],["02.35.0193","ESMALTE SINTETICO color: aluminio x 0.5lts","LTS",23373.56],["02.35.0141","ESMALTE SINTETICO color: blanco/acabado: brillante x1lts","LTS",17757.05],["02.35.0211","ESMALTE SINTETICO color: blanco/acabado: satinado x0.9lt 'al","LTS",8219.13],["02.35.0073","ESMALTE SINTETICO color: blanco/acabado: satinado x4lts","LTS",7312.69],["02.35.0190","ESMALTE SINTETICO multiaccion/color: gris obra PILAR S/COD x","LTS",5199.5],["02.52.0007","ESPEJO fijo incoloro 6mm","M2",69542.43],["02.43.0419","ESPIGA DOBLE conexión 3/4' manguera","UN",166.22],["02.43.0493","ESPIGA SIMPLE c/rosca M 3/4' polietileno","UN",155.33],["02.43.0421","ESPIGA TEE 3/4' polietileno s/rosca","UN",504.13],["02.26.0249","ESPUMA DE POLIURETANO x500ml 'tekbond'","UN",10804.81],["02.10.0034","ESTRUCTURA para cartel de obra/bastidor de hierro 20x40x1.60","M2",99790.0],["02.10.0002","ESTRUCTURA para cartel de obra/bastidor madera 1' a 3'","M2",21750.0],["02.10.0005","ESTRUCTURA para cartel de obra/bastidor madera 1' a 3'+chapa","M2",194500.0],["02.31.0023","FENOLICO multilaminado 18mm 1,22x2,44mts (pino/euca) 2,98m2","M2",6076.85],["02.16.0016","FICHA HEMBRA 3 patas 'kalop'","UN",1734.0],["02.16.0054","FICHA HEMBRA 3 patas 'richi'","UN",1362.82],["02.24.0089","FICHA MACHO 3 patas 10 amp ''kalop''","UN",1569.0],["02.16.0017","FICHA MACHO 3 patas 10 amp'richi'","UN",980.17],["02.16.0364","FICHA modular cristal rj45","UN",902.51],["02.35.0195","FIJADOR/SELLADOR al agua x10lts ''murallon'","LTS",1580.33],["02.35.0217","FIJADOR/SELLADOR al agua x20lts ''murallon'","LTS",1835.11],["02.35.0144","FIJADOR/SELLADOR al agua x20lts ''sinteplast'","LTS",1644.5],["02.35.0050","FIJADOR/SELLADOR al aguarras probase loxon p/acond.mamposter","LTS",5699.09],["02.35.0209","FIJADOR/SELLADOR fondo blanco x4lts ''casablanca''","LTS",21242.46],["02.26.0071","FILM STRETCH translucido/cristal ancho: 50cm","KG",13553.72],["02.33.0046","FLETE BAÑO QUIMICO (solo entrega) zona caba","UN",14800.0],["02.33.0049","FLETE BAÑO QUIMICO (solo entrega) zona la plata","UN",10000.0],["02.33.0022","FLETE BAÑO QUIMICO (solo entrega) zona sur","UN",14800.0],["02.23.0001","FLETE de proveedor","UN",14800.0],["10.33.0003","FLETE OFICINA (entrega+servicio de hidrogrua/retiro+servicio","UN",157500.0],["02.33.0015","FLETE RETIRO DE UNIDADES","UN",157500.0],["02.33.0045","FLETE SANITARIO (entrega+servicio de hidrogrua/retiro+servic","UN",157500.0],["02.41.0321","FLEXIBLE 1/2''x40cm agua/acero inoxidable","UN",7024.87],["02.43.0565","FLEXIBLE mallado 1/2''x20cm fijo","UN",3554.8],["02.43.0245","FLEXIBLE mallado 1/2''x30cm fijo","UN",4044.62],["02.43.0097","FLEXIBLE mallado 1/2''X40cm giratorio","UN",4478.35],["02.43.0246","FLEXIBLE mallado 1/2''x50cm fijo","UN",10970.4],["02.43.0578","FLEXIBLE pvc 1/2''x30cm","UN",1190.01],["02.41.0143","FLOTANTE automatico p/tanque hermetico polipropileno","UN",10302.75],["02.41.0056","FLOTANTE mecanico p/tanque alta presion con boya 3/4'","UN",7500.0],["02.41.0130","FLOTANTE p/deposito- silencioso/hembra/macho","UN",6489.52],["02.35.0118","FONDO P/GALVANIZADO ext/int x1lts 'Sherwin Williams'","LTS",19416.2],["02.35.0185","FONDO para galvanizado tipo: galvite","LTS",13223.86],["02.26.0015","FRATACHO abrasivo mediano","UN",2277.26],["02.26.0207","FRATACHO plastico 12x25cm","UN",1285.12],["02.26.0257","FRATACHO plastico 20cm","UN",1661.44],["02.26.0004","FRATACHO plastico 30cm","UN",1349.6],["02.26.0082","FRATACHO plastico con espuma 30cm","UN",3000.0],["02.41.0336","FUELLE conexion pvc extensible 35cm p/ inodoro/mochila/bocas","UN",1017.2],["02.43.0312","FUELLE conexion pvc p/ inodoro diam 40","UN",1061.42],["02.43.0354","GABINETE DE A°I° p/ canilla de servicio sobre pared 15x15cm","UN",12984.08],["02.30.0004","GABINETE P/MATAFUEGO de 3,5 a 5kg","UN",33000.0],["02.16.0588","GABINETE PVC estanco c/ puerta/242x242x126mm IP67","UN",39827.37],["02.26.0243","GANCHO J ZINCADO 1/4x60mm","UN",211.9],["02.39.0086","GARGOLAS Hº PREMOLDEADO 30x19x h:13cm","UN",19000.0],["02.39.0087","GARGOLAS Hº PREMOLDEADO 30x20x h:15cm","UN",33000.0],["02.26.0199","GOMA SECADOR de piso s/ cabo","UN",3320.25],["02.26.0052","GRAMPA MATALICA OMEGA p/caño 4'","UN",1262.55],["02.26.0110","GRAMPA METALICA MEDIA OMEGA p/caño 1'","UN",767.0],["02.26.0112","GRAMPA METALICA MEDIA OMEGA p/caño 1/2'","UN",100.0],["02.26.0111","GRAMPA METALICA MEDIA OMEGA p/caño 3/4'","UN",120.0],["02.26.0040","GRAMPA METALICA OMEGA p/ caño 1 1/2'","UN",675.77],["02.26.0183","GRAMPA METALICA OMEGA p/caño 1 1/4'","UN",230.35],["02.26.0063","GRAMPA METALICA OMEGA p/caño 1/2'","UN",179.17],["02.26.0184","GRAMPA METALICA OMEGA p/caño 3/4'","UN",70.0],["02.26.0169","GRAMPA METALICA soporte fijacion p/lavatorio 49x97mm","UN",1267.3],["02.26.0259","GRAMPA P/LAVATORIO larga (tipo: ferrum)","UN",2329.49],["02.26.0130","GRASA LITIO multiuso x18kg","KG",7713.5],["02.43.0590","GRIFERIA BAÑO AUTOMATICA c/manija (baño discapacitado) 'deca","UN",167137.45],["02.43.0591","GRIFERIA BAÑO MONOCOMANDO sobre mesada/temporizado /color: c","UN",51937.03],["02.43.0384","GRIFERIA BAÑO MONOCOMANDO sobre mesada/temporizado/linea: pi","UN",63315.48],["02.43.0385","GRIFERIA BAÑO TAPA TECLA UNIVERSAL p/deposito embutir color:","UN",34090.91],["02.43.0349","GRIFERIA BAÑO UN AGUA sobre lavatorio/pico corto/volante cru","UN",9713.39],["02.43.0598","GRIFERIA COCINA DOBLE COMANDO sobre mesada ''majos'","UN",51937.03],["02.43.0362","GRIFERIA COCINA DOBLE COMANDO sobre mesada pico de caño/line","UN",54747.39],["02.43.0371","GRIFERIA COCINA MONOCOMANDO sobre mesada/pico alto movil/lin","UN",101809.99],["02.43.0395","GRIFERIA valvula + tapa BAÑO VALVULA AUTOMATICA descarga min","UN",50700.11],["02.43.0389","GRIFERIA valvula + tapa BAÑO VALVULA AUTOMATICA descarga min","UN",52243.16],["02.08.0057","GUANTE ALGODON MOTEADO x par","UN",842.97],["02.08.0058","GUANTE ENGOMADO anticorte x par","UN",2242.98],["02.08.0060","GUANTE LATEX negro industrial x par","UN",4295.1],["02.08.0050","GUANTE VAQUETA medio paseo (indicar talle) x par","UN",4190.09],["02.14.0074","HIDROFUGO tambor x 200kg ''rapisec''","KG",700.0],["02.14.0056","HIDROFUGO tambor x 200kg ''sinteplast''","KG",770.0],["02.05.0022","HIDROFUGO x 20kg ''rapisec''","KG",1440.34],["02.05.0002","HIDROFUGO x 20kg ''sika''","KG",1476.35],["02.05.0004","HIDROFUGO x 20kg ''sinteplast''","KG",807.02],["02.05.0014","HIDROFUGO x 20kg ''weber''","KG",2150.0],["02.02.0001","HIERRO aletado diam 10 x12mts","UN",12800.0],["02.02.0002","HIERRO aletado diam 12 x12mts","UN",16900.0],["02.02.0003","HIERRO aletado diam 16 x12mts","UN",26419.42],["02.02.0008","HIERRO aletado diam 6 x12mts","UN",4800.0],["02.02.0009","HIERRO aletado diam 8 x12mts","UN",8200.0],["02.26.0195","HOJA SIERRA ACERO CIRCULAR 7 1/4'/178mm/24 dientes widia","UN",7200.0],["02.26.0194","HOJA SIERRA ACERO CIRCULAR 7 1/4'/178mm/36 dientes widia","UN",17000.0],["02.26.0067","HOJA SIERRA ACERO CIRCULAR 7 1/4'/178mm/40 dientes widia","UN",13300.0],["02.26.0209","HOJA SIERRA ACERO CIRCULAR 7 1/4'x 5/8' /184mm/24 dientes wi","UN",10000.0],["02.29.0074","HORMIGON H08 PIEDRA 6/20 (definir asentamiento) zona Gral Ro","M3",99700.0],["02.29.0110","HORMIGON H13 PIEDRA 10/30 (definir asentamiento) zona sur","M3",122000.0],["02.29.0111","HORMIGON H21 PIEDRA 6/12 (definir asentamiento) zona CABA","M3",130000.0],["02.29.0100","HORMIGON H21 PIEDRA 6/20 (definir asentamiento) zona CABA","M3",130000.0],["02.29.0062","HORMIGON H21 PIEDRA 6/20 (definir asentamiento) zona Gral Ro","M3",128851.76],["02.29.0093","HORMIGON H21 PIEDRA 6/20 (definir asentamiento) zona Merlo","M3",121258.9],["02.29.0008","HORMIGON H21 PIEDRA 6/20 (definir asentamiento) zona sur","M3",130000.0],["02.29.0052","HORMIGON H30 PIEDRA 10/30 (definir asentamiento) zona sur","M3",136000.0],["02.51.0023","IMPERMEABILIZANTE emulsion asfaltica/base acuosa x18kg/novas","KG",3237.28],["02.51.0025","IMPERMEABILIZANTE membrana en pasta con poliuretano/techos b","KG",4104.65],["02.51.0011","IMPERMEABILIZANTE membrana liquida con poliuretano/techos bc","KG",2987.22],["02.51.0014","IMPERMEABILIZANTE membrana liquida elastica/techos bco/rojo/","KG",5418.95],["02.51.0024","IMPERMEABILIZANTE membrana liquida fibrada/techos bco/rojo/v","KG",4441.09],["02.51.0020","IMPERMEABILIZANTE pintura asfaltica base solvente x18lts","LTS",2805.55],["02.51.0021","IMPERMEABILIZANTE pintura asfaltica base solvente x4lts","LTS",3254.51],["02.43.0324","INODORO ALTO integral (baño discapacitado) 'cordenons'","UN",195211.54],["02.43.0322","INODORO CORTO bco linea: domani 'piazza'","UN",64140.09],["02.43.0316","INODORO CORTO bco/linea diamante ''cordenons''","UN",102944.14],["02.43.0325","INODORO LARGO bco ''capea''","UN",69570.71],["02.43.0602","INODORO LARGO bco ''deca''","UN",120612.96],["02.43.0563","INSERTO estria fina plastica","UN",19731.1],["02.16.0217","INTERRUPTOR 1X10amp TERMOMAGNETICO llave termica unipolar ''","UN",2316.11],["02.16.0626","INTERRUPTOR 2X10amp TERMOMAGNETICO llave termica bipolar 'sc","UN",14133.97],["02.16.0030","INTERRUPTOR 2X10amp TERMOMAGNETICO llave termica bipolar ''j","UN",25009.0],["02.16.0471","INTERRUPTOR 2X16amp TERMOMAGNETICO llave termica bipolar","UN",22000.0],["02.16.0566","INTERRUPTOR 2X16amp TERMOMAGNETICO llave termica bipolar 'si","UN",5549.4],["02.16.0065","INTERRUPTOR 2X16amp TERMOMAGNETICO llave termica bipolar ''s","UN",14113.97],["02.16.0494","INTERRUPTOR 2X20amp TERMOMAGNETICO llave termica bipolar","UN",25009.0],["02.16.0625","INTERRUPTOR 2X20amp TERMOMAGNETICO llave termica bipolar 'sc","UN",14113.97],["02.16.0602","INTERRUPTOR 2X25amp TERMOMAGNETICO llave termica bipolar","UN",19900.0],["02.16.0060","INTERRUPTOR 2X25amp TERMOMAGNETICO llave termica bipolar ''s","UN",14635.0],["02.16.0577","INTERRUPTOR 2X32amp TERMOMAGNETICO llave termica bipolar","UN",4439.51],["02.16.0183","INTERRUPTOR 2X40amp TERMOMAGNETICO llave termica bipolar ''s","UN",24000.0],["02.16.0624","INTERRUPTOR 4X20amp TERMOMAGNETICO llave termica tetrapolar ","UN",43241.7],["02.16.0118","INTERRUPTOR 4X25amp TERMOMAGNETICO llave termica tetrapolar ","UN",30918.18],["02.16.0129","INTERRUPTOR 4X32amp TERMOMAGNETICO llave termica tetrapolar ","UN",43241.7],["02.16.0134","INTERRUPTOR 4X40amp TERMOMAGNETICO llave termica tetrapolar ","UN",43241.7],["02.16.0074","INTERRUPTOR 4X50amp TERMOMAGNETICO llave termica tetrapolar ","UN",65309.87],["02.16.0068","INTERRUPTOR 4X63amp TERMOMAGNETICO llave termica tetrapolar ","UN",65309.87],["10.16.0058","JABALINA 1/2''x1,5mts c/ tomacable (JAB+MORS)","UN",10054.86],["02.16.0034","JABALINA 3/4''x1,5mts c/ tomacable (JAB+MORS)","UN",26300.0],["02.16.0225","JABALINA 5/8''x1,5mts c/ tomacable (JAB+MORS)","UN",15111.56],["02.16.0303","KIT EMERGENCIA p/panel led (12 a 60W)","UN",55000.0],["02.43.0503","KIT FIJACION para monocomando","UN",1449.77],["02.16.0206","KIT MONOFASICO (HOMOLOGADO EDESUR) medidor tablero caja para","UN",163341.0],["02.35.0226","LACA PROTECTORA DE METALES transparente x4lts 'vitelast'","LTS",17574.93],["02.14.0066","LADRILLO CERAMICO HUECO 08x18x33 - 6 agujeros","UN",448.12],["02.14.0069","LADRILLO CERAMICO HUECO 12x18x33 - 9 agujeros","UN",735.0],["02.14.0010","LADRILLO CERAMICO HUECO 18x18x33 - 12 agujeros","UN",1175.0],["02.14.0044","LADRILLO CERAMICO portante 18x19x33","UN",1036.36],["02.14.0048","LADRILLO COMUN 10x22x4,5","UN",146.28],["02.14.0003","LADRILLO COMUN 12x25x6","UN",150.0],["02.17.0036","LAMPARA LED 105w E40 (codigo art 02.17.0035)","UN",39595.0],["02.45.0005","LAMPARA LED 20w E27","UN",1658.8],["02.16.0596","LAMPARA LED 220v/10w/luz fria","UN",691.0],["02.16.0321","LAMPARA LED 220v/15w/luz fria","UN",1253.88],["02.16.0597","LAMPARA LED 220v/7w/luz fria","UN",750.02],["10.35.0014","LATEX CIELORRASO x 20lts ''casablanca''","LTS",2817.1],["02.35.0220","LATEX EXTERIOR color: afternoon /cod: 6675/133-C4 x 18lts 's","LTS",13266.68],["02.35.0189","LATEX EXTERIOR color: azul obra PILAR S/COD x 17.4lts 'dural","LTS",9459.09],["02.35.0191","LATEX EXTERIOR color: celeste PANTONE 284 C x 18ts","LTS",6909.96],["02.35.0219","LATEX EXTERIOR color: inventine orange /cod: 6633/120-C3 x 1","LTS",13362.8],["02.35.0221","LATEX EXTERIOR color: lcy lemonade /cod: 1667/138-C2 x 18lts","LTS",6490.13],["02.35.0049","LATEX EXTERIOR impermeabilizante p/frentes/color: blanco x20","LTS",3944.39],["02.35.0151","LATEX EXTERIOR impermeabilizante p/frentes/color: blanco x20","LTS",2817.1],["02.35.0100","LATEX EXTERIOR impermeabilizante p/frentes/color: blanco x20","LTS",1082.64],["02.35.0032","LATEX INTERIOR proteccion total x20lts ''casablanca''","LTS",4551.2],["10.35.0015","LATEX INTERIOR proteccion total/color: blanco/acabado: mate ","LTS",3843.05],["02.35.0177","LATEX INTERIOR/EXTERIOR color: blanco x 20lts 'colorin'","LTS",2669.37],["02.35.0196","LATEX INTERIOR/EXTERIOR color: blanco x 20lts 'murallon'","LTS",2672.31],["02.35.0065","LATEX INTERIOR/EXTERIOR PRO x 20lts 'casablanca'","LTS",2669.37],["02.43.0599","LAVATORIO 3 agujeros+columna blanca 'deca'","UN",127767.32],["02.43.0348","LAVATORIO FIJO 1Ø integral (baño discapacitado) 'cordenons'","UN",278247.25],["02.35.0178","LIJA AL AGUA doble A/FINA Nro150","UN",616.31],["02.35.0184","LIJA AL AGUA doble A/FINA Nro180","UN",990.0],["02.35.0180","LIJA AL AGUA doble A/MEDIANA Nro100","UN",1110.82],["02.35.0201","LIJA AL AGUA doble A/MEDIANA Nro120","UN",822.61],["02.35.0033","LIJA AL AGUA doble A/MEDIANA Nro150","UN",799.61],["02.35.0084","LIJA AL AGUA doble A/MEDIANA Nro180","UN",566.14],["02.35.0199","LIJA AL AGUA doble A/MUY FINA Nro220","UN",560.1],["02.26.0215","LIJA ANTIEMPASTE Nro 120","UN",1110.82],["02.26.0214","LIJA ANTIEMPASTE Nro 180","UN",1110.82],["02.26.0216","LIJA RUBI Nro 150","UN",537.67],["02.26.0212","LINTERNA LED recargable 11leds","UN",43248.76],["02.17.0046","LISTON armado IP65 1x18w","UN",1905.56],["02.17.0017","LISTON armado IP65 2x18w","UN",2680.12],["02.50.0069","LLAVE DE PASO 1/2' bronce c/campana","UN",10587.18],["02.43.0500","LLAVE DE PASO PP 3/4'","UN",1833.8],["02.50.0077","LLAVE DE PASO TOTAL 1' bronce","UN",15396.24],["02.43.0460","LLAVE PPTF 20(3/4') PASO TOTAL 'tubo fusion'","UN",10146.05],["02.43.0461","LLAVE PPTF 25(1') PASO TOTAL 'tubo fusion'","UN",12245.22],["02.43.0463","LLAVE PPTF 40(1 1/2') PASO TOTAL 'tubo fusion'","UN",20370.02],["02.43.0579","LLAVE PPTF 50( 2') PASO TOTAL 'tubo fusion'","UN",31349.38],["02.43.0580","LLAVE PPTF 63(2 1/2') PASO TOTAL 'tubo fusion'","UN",45928.71],["02.43.0532","LLAVE PPTF c/cabezal de bronce 20(3/4') PASO TOTAL 'tubo fus","UN",9131.45],["02.43.0533","LLAVE PPTF c/cabezal de bronce 25(1') PASO TOTAL 'tubo fusio","UN",11020.69],["02.43.0551","LLAVE PPTF c/cabezal de bronce 32(1 1/4') PASO TOTAL 'tubo f","UN",8744.43],["02.16.0288","LLAVE SELECTORA PALANCA AEA 0-1 con microcontacto NA","UN",15150.49],["02.16.0287","LLAVE SELECTORA PALANCA AEA 1-0-2 con microcontactos NA/NC","UN",12914.96],["02.10.0003","LONA impresa para cartel de obra","M2",12000.0],["02.41.0379","LUBRICANTE en aerosol 240cm3 ''losung''","UN",5613.52],["02.41.0180","LUBRICANTE en aerosol 400cm3 ''awaduct''","UN",8932.73],["02.02.0072","MALLA ELECTROSOLDADA 15x15- 3,8mm (5x2)","M2",1750.0],["02.02.0074","MALLA ELECTROSOLDADA 15x15- 5.5mm (3X2)","M2",3700.0],["02.02.0075","MALLA ELECTROSOLDADA 15x15- 5.5mm (5x2)","M2",3700.0],["02.02.0076","MALLA ELECTROSOLDADA 15x15- 6mm (6x2,40)","M2",6250.0],["02.13.0032","MALLA fibra de vidrio para revoque 5x5mm/90grs/rollo 1x50mts","M2",700.0],["02.06.0013","MALLA PLASTICA SUJETADORA transparente 2mts ancho","M2",1002.27],["02.49.0127","MANGUITO de reparacion Ø110 ''duratop''","UN",2796.38],["02.49.0137","MANGUITO de reparacion Ø40 ''duratop''","UN",968.46],["02.49.0157","MANGUITO de reparacion Ø63 ''duratop''","UN",1412.89],["02.35.0064","MANTA ELASTICA p/refuerzo de membrana liquida 1x25mts","M2",2200.0],["02.36.0003","MANTENIMIENTO/SERVICE vehiculos y maquinas","UN",130800.0],["04.56.0017","Marcador para Pizarra","UN",3500.0],["02.26.0258","MASILLA epoxi sanitario x70gr","UN",3969.0],["02.26.0152","MASILLA epoxi x70gr 'poxilina'","UN",4138.31],["02.41.0281","MASILLA juntas p/vidrios y sanitarios x 1 KG","KG",3703.0],["02.13.0073","MASILLA juntas y terminacion x 15kg ''anclaflex''","KG",1301.71],["02.13.0061","MASILLA juntas y terminacion x 32kg ''anclaflex''","KG",700.13],["02.13.0050","MASILLA juntas y terminacion x 32kg ''knauf''","KG",700.13],["02.13.0077","MASILLA p/placas antihumedad x 15kg ''ancaflex''","KG",1466.67],["02.26.0079","MASILLA POLIESTER tradicional x1kg","KG",15042.58],["02.30.0008","MATAFUEGO EXTINTOR ABC 10kg (polvo quimico) + baliza","UN",168220.0],["02.30.0013","MATAFUEGO EXTINTOR ABC 5kg","UN",52000.0],["02.26.0251","MECHA BROCA WIDIA 12mm","UN",16771.9],["02.26.0252","MECHA BROCA WIDIA 4.75mm","UN",2021.31],["02.26.0254","MECHA BROCA WIDIA 5mm","UN",1111.03],["02.26.0255","MECHA BROCA WIDIA 6mm","UN",1369.76],["02.26.0253","MECHA BROCA WIDIA 8mm","UN",1881.47],["02.26.0226","MECHA BROCA WIDIA sds plus 12x160mm","UN",3085.13],["02.26.0236","MECHA BROCA WIDIA sds plus 13x150mm","UN",3745.0],["02.26.0223","MECHA BROCA WIDIA sds plus 16x260mm","UN",6500.0],["02.26.0229","MECHA BROCA WIDIA sds plus 8x160mm","UN",2805.79],["02.26.0245","MECHA COPA para hormigon/mamposteria 50mm","UN",14500.0],["02.26.0220","MECHA COPA para metal 22mm'bosh'","UN",9500.0],["02.06.0004","MEMBRANA ASFALTICA 4mm/1 lado aluminizado rollo x10m2 (40kg)","M2",4400.0],["02.06.0051","MEMBRANA ASFALTICA AUTOADHESIVA c/aluminio rollo 0.10x25mts","M2",15665.69],["02.06.0050","MEMBRANA ASFALTICA AUTOADHESIVA c/aluminio rollo 0.25x25mts","M2",10729.77],["02.28.0088","MENSULA apoyo de mesada 55x35x3cm","UN",25000.0],["02.02.0207","MENSULA hierro en 'L' reforzada 20x20cm","UN",9500.0],["02.32.0006","MESADA granito tipo: gris mara/esp: 2cm","M2",20454.55],["02.02.0195","METAL DESPLEGADO liviano hoja de 0.75x2.00mt","M2",2333.33],["02.26.0102","MEZCLA CEMENTICIA repara paredes exteriores a base de cement","KG",2669.58],["02.43.0595","MINGITORIO URINARIO OVAL bco 38x26x48.5cm 'deca'","UN",52243.16],["02.22.0067","MOBILIARIO M1 segun descripcion: Armario en aula (2x2.6mts) ","UN",700000.0],["02.22.0068","MOBILIARIO M2 segun descripcion: Armario en aula (1.7x0.9mts","UN",202000.0],["02.22.0066","MOBILIARIO M3 segun descripcion: Armario en aula (1.5x0.9mts","UN",163668.64],["02.16.0005","MODULO BASTIDOR 50x100mm","UN",235.88],["02.16.0198","MODULO COMPLETO ILUMINACION (1bastidor+1 tapa+2tapon ciego+1","UN",1304.4],["02.16.0095","MODULO COMPLETO TOMACORRIENTE (1bastidor+1 tapa+2tapon ciego","UN",1540.0],["02.16.0349","MODULO COMPLETO TOMACORRIENTE (1bastidor+1 tapa+2tapon ciego","UN",1500.0],["02.16.0348","MODULO COMPLETO TOMACORRIENTE (1bastidor+1 tapa+2tapon ciego","UN",3020.0],["02.16.0356","MODULO COMPLETO TOMACORRIENTE DOBLE (1bastidor+1 tapa+1tapon","UN",2391.0],["02.16.0004","MODULO PUNTO color: blanco 'jeluz'","UN",439.67],["02.16.0006","MODULO TAPON CIEGO color: blanco 'jeluz'","UN",54.72],["02.16.0503","MODULO TOMACORRIENTE CAPSULADO monofasico (caja+toma 2x10A+T","UN",6319.0],["02.16.0003","MODULO TOMACORRIENTE con tierra color: blanco 'jeluz'","UN",178000.0],["02.38.0112","MOSAICO CALCAREO VEREDA 20x20cm 3 vainillas color: varios","M2",9917.35],["02.38.0058","MOSAICO CALCAREO VEREDA 20x20cm 6 vainillas color: varios","M2",19750.0],["02.38.0043","MOSAICO CALCAREO VEREDA 20x20cm 9 panes color: varios","M2",19750.0],["02.38.0057","MOSAICO CALCAREO VEREDA 40x40cm 64 panes color: varios","M2",23140.5],["02.38.0024","MOSAICO GRANITICO 30x30cm fondo gris/grano chico","M2",19834.71],["02.09.0001","NIVEL OPTICO c/ tripode y regla c/funda 5mts AP 228 'pentax'","UN",601167.42],["02.16.0366","OJO DE BUEY 22mm led/verde 24V ''baw''","UN",3090.0],["02.14.0004","PALLET comun de madera 1x1mts","UN",30000.0],["02.16.0525","PARARRAYO de 5 puntas franklin de AºIº 1/2' 'Metal-ce'","UN",150527.81],["02.57.0001","PASADOR HIERRO liso diam 20 x40cm","UN",3000.0],["02.27.0021","PASADOR porta candado 140mm","UN",3300.0],["02.38.0113","PASTINA classic color: arena x5kg 'weber'","KG",413.22],["02.38.0016","PASTINA classic color: blanco x5kg 'weber'","KG",2182.0],["02.38.0110","PASTINA FLUIDA bolsa x1kg clasica piezas normales","KG",3381.0],["02.38.0059","PASTINA FLUIDA bolsa x1kg clasica piezas normales/color: tal","KG",3381.0],["02.22.0069","PERCHERO MADERA de cedro 1'x1.20mts cepillado y barnizado c/","UN",68000.0],["02.41.0398","PICO P/ACOPLE RAPIDO plástico 1/4'","UN",1415.7],["02.14.0011","PIEDRA PARTIDA 10/30 bolson xm3","M3",51500.0],["02.14.0002","PIEDRA PARTIDA 6/20 bolson xm3","M3",53500.0],["02.26.0256","PILA AA e95 'energizer'","UN",5112.34],["02.43.0342","PILETA BACHA A° I° 30cm diam/h: 15cm","UN",44935.38],["02.43.0597","PILETA BACHA A° I° 30cm diam/h: 15cm 'mi pileta'","UN",44935.38],["02.43.0588","PILETA BACHA A° I° 34cmx44cmx20cm","UN",64915.2],["02.43.0572","PILETA BACHA plastico 37.5cmx25cm ''dealer''","UN",6681.0],["02.43.0335","PILETA BACHA plastico 48cmx39cm ''duke''","UN",22481.14],["02.43.0329","PILETA DE COCINA AºIº (37x34x15) simple ''mi pileta''","UN",84487.45],["02.43.0596","PILETA DE COCINA AºIº (57x37x18) doble bajo mesada 'mi pilet","UN",113517.1],["02.43.0587","PILETA DE COCINA AºIº (60x37x24) simple","UN",36758.4],["02.43.0344","PILETA DE COCINA AºIº (71x37x20) doble bajo mesada 'mi pilet","UN",163578.83],["02.49.0054","PILETA DE PATIO Ø110 entrada 40 y salida 63 'duratop'","UN",7999.91],["02.43.0133","PILETA DE PISO 5 entradas Ø40x63 15x15 c/oring/poliangular '","UN",8232.04],["02.35.0225","PINCEL cerda sintetica Nro 25","UN",2121.6],["02.35.0086","PINCEL ECO CERDA NATURAL con mezcla de filamentos N20 'matez","UN",1605.0],["10.35.0024","PINCEL ECO N30","UN",6650.15],["02.35.0031","PINCEL GR.SPECIAL CERDA BLANCA Nro 15","UN",2717.04],["02.35.0043","PINCEL p/todo tipo de pintura 2'' (50.8mm) utility brush cer","UN",3500.0],["02.35.0174","PINCEL para latex N25 2,50'' especial ''byp''","UN",6227.42],["02.35.0063","PINCEL PARA SINTETICO Y AL AGUA Nro20 2'' cerda natural ''el","UN",319.63],["02.35.0016","PINCEL PRO EXPORT CERDA BLANCA 1 1/2''","UN",2447.98],["02.35.0015","PINCEL PRO EXPORT CERDA BLANCA 1''","UN",1755.16],["02.35.0017","PINCEL PRO EXPORT CERDA BLANCA 2''","UN",1656.33],["02.35.0113","PINCEL PRO EXPORT CERDA BLANCA 3'' Nro 30","UN",5588.01],["02.35.0108","PINCEL sintetico/barnices Nro20 2'' pro export cerda blanca ","UN",2500.0],["02.35.0192","PINCEL sintetico/barnices virola Nro15","UN",2154.81],["02.35.0186","PINCEL sintetico/barnices virola Nro20","UN",1420.83],["02.35.0206","PINCEL sintetico/barnices virola Nro7","UN",3227.11],["10.35.0028","PINCELETA GRANDE CABO AZUL 4''","UN",6000.03],["02.35.0218","PINTURA para demarcacion vial alquidica (base solvente) x20l","LTS",5257.27],["02.35.0092","PINTURA RESTAURADOR de superficie x lts 'miksa'","LTS",3080.0],["02.26.0018","PISTOLA APLICADORA para cartuchos de silicona","UN",3772.74],["02.26.0058","PITON cerrado s/tope Nº8","UN",97.06],["02.18.0003","PIZARRA para marcador 120cm x 60cm","UN",39000.0],["02.18.0001","PIZARRA tiza premium 122cm x 275cm","UN",124800.0],["02.13.0070","PLACA TEXTURADA LANA DE VIDRIO+PVC 20mm (0.605x1.22mts) 'iso","M2",12735.06],["02.13.0028","PLACA YESO ANTIHUMEDAD 12,5mm (1,20x2,40mts) 2.88m2","M2",6415.32],["02.13.0035","PLACA YESO STANDARD 12,5mm (1,20x2,40mts) 2.88m2","M2",3819.58],["02.13.0034","PLACA YESO STANDARD 9mm (1,20x2,40mts)","M2",4533.98],["02.06.0028","PLANCHA poliestireno expandido/alta densidad 10mm","M2",2863.64],["02.06.0030","PLANCHA poliestireno expandido/alta densidad 20mm","M2",3990.0],["02.06.0010","PLANCHA poliestireno expandido/alta densidad 50mm","M2",10000.0],["04.56.0027","PLOTEO impresion A1 (59.5cm x 84,1cm)/color/papel comun","UN",2303.72],["04.56.0029","PLOTEO impresion A3 (29,7cm x 42cm)/color/papel comun","UN",55504.13],["02.41.0397","PORTA REJA c/rejilla A°I° 12x12cm","UN",4788.37],["02.41.0396","PORTA REJA c/rejilla A°I° 15x15cm","UN",6001.55],["02.41.0010","PORTA REJILLA 110 12x12cm 'awaduct'","UN",5245.63],["02.41.0378","PORTA REJILLA 110 15x15cm 'awaduct'","UN",6863.23],["02.16.0473","PORTALAMPARA c/rosca E40, casquillo 5/8' c/cruceta","UN",8224.0],["02.16.0616","PORTALAMPARA c/rosca y chicote E27/color: negro","UN",600.0],["02.01.0217","PORTON EXTERIOR acceso(PM01) 4.60x2.30mts/hoja: 4hojas de ab","UN",3077000.0],["02.31.0013","POSTE EUCA impregnado 12/16x6mts","UN",92000.0],["02.26.0250","PRECINTO nylon 3.6x200mm negro","UN",35.7],["02.26.0208","PRECINTO nylon 3.6x250mm negro","UN",47.64],["02.26.0210","PRECINTO pvc serrucho fina p/flappers","UN",117.81],["02.01.0248","PREMARCOS aberturas /Obra: Merlo","UN",2655000.0],["02.16.0583","PRENSACABLE PVC c/tuerca 1'/HP05","UN",848.11],["02.43.0288","PROLONGADOR cromado p/canillas o flexibles 1/2'x1/2'","UN",4112.69],["02.24.0040","PROTECTOR OCULAR lente incoloro","UN",2066.12],["10.16.0063","PROYECTOR/reflector LED - 200W","UN",7579.32],["02.16.0514","PROYECTOR/reflector LED - 50W exterior/luz dia","UN",8975.0],["02.16.0618","PUENTE PEINE BIPOLAR p/termicas 57polos","UN",39000.0],["02.01.0210","Puerta (PEA01) 2,60 x 2,30mts /premarco y contramarco tipo: ","UN",2301131.75],["02.01.0212","Puerta (PEA01*) 2,60 x 2,30mts /premarco y contramarco tipo:","UN",2301131.75],["02.01.0216","PUERTA (PEA02) 2,60 x 2,30mts /premarco y contramarco tipo: ","UN",2599350.0],["02.01.0213","Puerta (PEA04) 2,60 x 2,30mts /premarco y contramarco tipo: ","UN",969159.16],["02.01.0211","Puerta (PEA05) 1,60 x 2,30mts /premarco y contramarco tipo: ","UN",1709696.16],["02.01.0218","PUERTA EXTERIOR (PM02) 1.75x2.30mts/hoja: 3hojas de abrir ci","UN",1090000.0],["02.01.0219","PUERTA EXTERIOR de escape(PM03) 1.60x2.35mts/hoja: 2hojas de","UN",1970000.0],["02.01.0220","PUERTA EXTERIOR de escape(PM03*) 1.70x2.30mts/hoja: 2hojas d","UN",2040000.0],["02.01.0221","PUERTA INTERIOR (PIM01) 1.25x2.20mts/hoja: 2hojas de abrir c","UN",545619.84],["02.01.0222","PUERTA INTERIOR (PIM02) 0.95x2.20mts/hoja: 1hoja de abrir/ma","UN",270909.1],["02.01.0223","PUERTA INTERIOR (PIM02*) 0.95x2.20mts/hoja: 1hoja de abrir/m","UN",270909.1],["02.01.0224","PUERTA INTERIOR (PIM03) 0.85x2.03mts/hoja: 1hoja de abrir/ma","UN",213966.95],["02.01.0233","PUERTA PLACA (PIC01) 1,20x2,50mts /Tipo: placa MDF /Marco: c","UN",759849.99],["02.01.0234","PUERTA PLACA (PIC02) 0,85x2,50mts /Tipo: placa MDF /Marco: c","UN",560800.0],["02.01.0236","PUERTA PLACA (PIC03) 0,70x2,50mts /Tipo: placa MDF /Marco: c","UN",537800.0],["02.01.0237","PUERTA PLACA (PIC04) 1,60x2,50mts /Tipo: placa MDF /Marco: c","UN",823349.99],["02.01.0238","PUERTA PLACA (PIC05) 1,00x2,50mts /Tipo: placa MDF /Marco: c","UN",578600.0],["02.01.0249","PUERTA PLACA (PIM01) 0,65x1,65mts /Tipo: placa MDF /Marco: c","UN",303000.0],["02.30.0023","PULSADOR DE AVISO MCP200CS rearmable c/tapa de acrilico cert","UN",43921.0],["02.11.0022","RAFIA REFORZADA ROLLO sin ojales color verde 2.00m x 50mts","M2",1020.0],["02.11.0005","RAFIA ROLLO color verde 2.00m x 50mts","M2",615.0],["02.49.0124","RAMAL simple a 45º 110x110 ''duratop''","UN",6034.82],["02.49.0159","RAMAL simple a 45º c/acceso reducido 110x63 ''duratop''","UN",4096.18],["02.49.0042","RAMAL simple a 45º H-H diam 40 ''duratop''","UN",2032.06],["02.41.0353","RAMAL simple a 90º H-H 110x110 ''duratop''","UN",4809.4],["02.49.0154","RAMAL simple a 90º H-H 40x40 ''duratop''","UN",2296.61],["02.48.0047","RAMAL simple a 90º M-H 110x63 ''duratop''","UN",4138.85],["02.49.0210","RAMAL simple PVC a 90º M-H 63x63","UN",1286.41],["02.29.0112","RDC 300 zona: Gral Rodriguez","M3",114275.84],["02.29.0104","RDC 300 zona: Merlo","M3",114275.84],["02.49.0192","RECEPTACULO HORIZONTAL BAJO 110x63 'duratop'","UN",2565.05],["02.49.0205","REDUCCION CONCENTRICA PVC 63x40","UN",471.88],["02.49.0193","REDUCCION EXCENTRICA PVC 110x63","UN",1149.86],["02.49.0190","REDUCCION PVC 125x110","UN",7163.8],["02.28.0100","REJA (R01) 3,00x1,00mts (segun plano)/ Obra: Merlo","UN",233000.0],["02.28.0101","REJA (R02) 2,80x0,50mts (segun plano)/ Obra: Merlo","UN",188000.0],["02.28.0102","REJA (R03) 1,40x0,50mts (segun plano)/ Obra: Merlo","UN",139000.0],["02.28.0103","REJA (R04) 1,40x2,45mts (segun plano)/ Obra: Merlo","UN",295000.0],["02.28.0104","REJA (R05) 1,00x1,00mts (segun plano)/ Obra: Merlo","UN",139000.0],["02.28.0105","REJA (R06) 2,80x0,50mts (segun plano)/ Obra: Merlo","UN",188000.0],["02.28.0106","REJA (R07) 2,00x1,00mts (segun plano)/ Obra: Merlo","UN",215000.0],["02.28.0107","REJA (R08) 1,00x0,50mts (segun plano)/ Obra: Merlo","UN",110000.0],["02.41.0174","REJILLA A°I° 15x15cm","UN",10078.38],["02.41.0377","REJILLA c/marco A°I° 20x20cm","UN",9179.3],["02.41.0277","REJILLA PILETA DE PATIO 15x15cm","UN",11735.75],["02.16.0535","RELEVO TERMICO 16A-18A (protector termico)","UN",99000.0],["02.26.0231","REMACHE DE ALUMINIO 3.5x14mm cabeza chata","UN",27.68],["02.26.0217","REMACHE DE ALUMINIO 4x10mm cabeza chata","UN",31.4],["02.14.0080","REPARADOR hormigon visto x10kg 'weber'","KG",2339.0],["02.41.0388","REPUESTO boton superior (mochila/inodoro) doble accionamient","UN",2341.51],["02.41.0390","REPUESTO boton superior (mochila/inodoro) simple accionamien","UN",2941.14],["02.41.0389","REPUESTO palanca 3/8' (deposito mochila) accionamiento front","UN",3765.23],["02.30.0026","RESISTENCIA de final de linea RE3K9/Obra: Pilar","UN",1830.0],["02.35.0059","RODILLO ANTIGOTA extra largo x 23cm 'lesters'","UN",6754.35],["02.35.0014","RODILLO ANTIGOTA ultra rap x 22cm","UN",6304.06],["02.35.0107","RODILLO LANA NATURAL 22cm ''rulfix''","UN",2960.33],["10.35.0031","RODILLO LANA NATURAL mini epoxi 10cm","UN",692.9],["10.35.0032","RODILLO LANA NATURAL mini epoxi 5cm","UN",502.26],["02.35.0047","RODILLO PARA ESMALTE 23cm/repuesto felpa+porta rod.jaula ''b","UN",5708.03],["02.35.0181","RODILLO PARA LATEX antigota 23cm/repuesto felpa+porta rod. j","UN",3468.01],["02.35.0208","RODILLO PELO CORTO 11cm/lana sintetica","UN",1500.0],["10.35.0035","RODILLO PELO CORTO 22cm/lana sintetica","UN",5800.0],["02.35.0078","RODILLO PELO LARGO 22cm/lana sintetica","UN",4146.88],["02.43.0495","ROSCA con tuerca polietileno (3/4')","UN",148.86],["10.16.0067","SEÑALIZADOR LUMINOSO salida de emergencia/led (autonomia 6 h","UN",32000.0],["02.29.0092","SEPARADOR PLASTICO tipo: caballete/para hormigón rapi/20 x15","UN",37.76],["02.29.0044","SEPARADOR PLASTICO tipo: caballete/para hormigon st/50 x500u","UN",86.69],["02.29.0105","SEPARADOR PLASTICO tipo: tope conico/para encofrados hormigó","UN",32.87],["02.29.0106","SEPARADOR PLASTICO tipo: tope conico/para encofrados hormigó","GL",2119755.29],["02.29.0063","SERVICIO DE BOMBA arrastre/zona Gral Rodriguez","UN",427700.0],["02.29.0088","SERVICIO DE BOMBA arrastre/zona Merlo","UN",427700.0],["02.29.0102","SERVICIO DE BOMBA pluma/zona CABA","UN",490000.0],["02.29.0064","SERVICIO DE BOMBA pluma/zona Gral Rodriguez","UN",500000.0],["02.29.0089","SERVICIO DE BOMBA pluma/zona Merlo","UN",550000.0],["02.29.0090","SERVICIO DE BOMBEO bombeado c/ arrastre xm3 zona Merlo","M3",4277.0],["02.29.0066","SERVICIO DE BOMBEO bombeado c/ arrastre xm3/ zona Gral Rodri","M3",4227.0],["02.29.0091","SERVICIO DE BOMBEO bombeado c/ pluma xm3 zona Merlo","M3",5500.0],["02.29.0103","SERVICIO DE BOMBEO bombeado c/ pluma xm3/zona caba","M3",6000.0],["02.29.0065","SERVICIO DE BOMBEO bombeado c/ pluma xm3/zona Gral Rodriguez","M3",5000.0],["02.33.0004","SERVICIO DE LIMPIEZA","UN",20300.0],["02.33.0005","SERVICIO DE LIMPIEZA FS","UN",563000.0],["02.28.0099","SERVICIO MAT+MO herreria","GL",328000.0],["02.28.0098","SERVICIO MO herreria","UN",49586.78],["02.01.0053","SERVICIO MO+COLOCACION carpinterias","GL",5085000.0],["02.01.0250","SERVICIO MO+COLOCACION modulos sanitarios","GL",463471.08],["02.19.0032","SERVICIO TRASLADO+COLOCACION equipamiento urbano","GL",150000.0],["02.52.0018","SERVICIO TRASLADO+COLOCACION vidrios/espejos/acrilicos","UN",390000.0],["02.26.0242","SET LLAVES TUBO","UN",53719.01],["02.43.0423","SIFON GOMA SIMPLE","UN",3492.78],["02.22.0031","SILLA para oficina","UN",51333.4],["02.35.0085","SINTETICO BRILLANTE color: negro x1lts","LTS",9338.84],["02.30.0022","SIRENA DE INCENDIO estrobo P2RL con luz y candela regulable/","UN",158604.0],["02.43.0504","SOBRETAPA plastica blanca 'ideal'","UN",2035.73],["10.30.0004","SOPORTE MATAFUEGO gancho hasta 10kg","UN",1780.0],["02.52.0015","SOPORTE para montaje de espejo kit x 4unidades","UN",3000.0],["02.10.0037","STENCIL (logo: personas con movilidad reducida) 1.00x1.00mts","UN",14900.0],["02.16.0599","TABLERO/GABINETE METALICO 1100x600x160mm/144 bocas","UN",560027.58],["02.16.0246","TABLERO/GABINETE METALICO 300x300x120mm/24 tomas/ext. Estanc","UN",110000.0],["02.16.0587","TABLERO/GABINETE METALICO 300x450x100mm/24 bocas/ext. Estanc","UN",112100.0],["02.16.0623","TABLERO/GABINETE METALICO 350x450x120mm/36 bocas/ext. Estanc","UN",109400.0],["02.16.0396","TABLERO/GABINETE METALICO 450x450x120mm c/contrafrente calad","UN",81397.46],["02.16.0281","TABLERO/GABINETE METALICO 550x450x120mm/54 bocas/ext. Estanc","UN",140000.0],["02.16.0589","TABLERO/GABINETE METALICO 600x750x100mm/80 bocas/ext. Estanc","UN",184312.55],["02.16.0310","TABLERO/GABINETE METALICO embutir/40 bocas/liviano/lp20","UN",69000.0],["02.16.0529","TABLERO/GABINETE METALICO embutir/8 bocas","UN",37649.0],["02.05.0021","TACURU aditivo vinilico x 10lts","LTS",11300.0],["02.05.0020","TACURU aditivo vinilico x1lt 'weber'","LTS",17130.4],["02.05.0018","TACURU aditivo vinilico x200lts 'rapisec'","LTS",2500.0],["02.05.0016","TACURU aditivo vinilico x20lts","LTS",2750.0],["02.43.0516","TANQUE cisterna vertical polietileno 2500lts 'waterplast'","UN",540111.0],["02.43.0429","TANQUE DE RESERVA tricapa/1000lts 'waterplast'","UN",107231.41],["02.43.0095","TANQUE DE RESERVA tricapa/2000lts 'waterplast'","UN",444068.6],["02.43.0577","TANQUE DE RESERVA tricapa/5000lts 'waterplast'","UN",1033057.85],["02.26.0008","TANZA NYLON albañil 0.80mm xcarretel","UN",3110.74],["02.26.0138","TANZA NYLON albañil 1mm x100mts","UN",44000.0],["02.16.0512","TAPA BASTIDOR 50x100mm","UN",243.42],["02.41.0050","TAPA CAMARA chapa reforzada/a°i° 60x60","UN",28659.15],["02.54.0033","TAPA CANALETA chapa Nro 25 (segun imagen adjunta)","UN",25000.0],["02.48.0039","TAPA CIEGA AºIº para piso 15x15cm","UN",9480.12],["02.16.0595","TAPA CIEGA pvc 10x10 color: blanco","UN",625.0],["02.16.0601","TAPA CIEGA pvc 8x12 color: blanco","UN",537.46],["02.43.0505","TAPA INTERNA plastica para deposito 'ideal'","UN",4053.49],["02.49.0085","TAPA PP H 1/2'","UN",111.64],["02.49.0215","TAPA PP H 3/4' 'tg plast'","UN",181.22],["02.43.0593","TAPA PUERTA acero inoxidable p/llave de paso canilla de serv","UN",15016.36],["02.43.0356","TAPA PUERTA acero inoxidable p/llave de paso canilla de serv","UN",24802.05],["02.50.0012","TAPON M 1/2' 'epoxi'","UN",86.84],["02.50.0010","TAPON M 3/4' 'epoxi'","UN",136.46],["02.49.0082","TAPON PP M 1/2' 'tg plast'","UN",86.84],["02.49.0083","TAPON PP M 3/4'","UN",136.46],["02.49.0214","TAPON PP M 3/4' 'tg plast'","UN",142.39],["02.43.0072","TAPON PPTF 13mm (1/2')","UN",116.53],["02.26.0098","TARUGO MULTIUSO NT8 (8mm) fijacion espiga ladrillo hueco","UN",62.08],["02.13.0027","TARUGO PLASTICO c/tope 8mm x 100u","UN",77.6],["02.13.0012","TARUGO PLASTICO s/tope 8mm x 100u","UN",26.69],["02.43.0497","TEE 90º PVC soldable 20mm ''tigre''","UN",601.94],["02.43.0417","TEE 90° HH 1/2' polipropileno","UN",332.86],["02.41.0036","TEE a 90º diam 20 ''aqcua system''","UN",279.89],["02.43.0521","TEE con rosca central hembra 20x1/2' 'tubo fusion'","UN",1916.64],["02.43.0448","TEE PPTF 20 (3/4') ''tubo fusion''","UN",279.89],["02.43.0449","TEE PPTF 25 (1') ''tubo fusion''","UN",425.09],["02.43.0025","TEE PPTF 32 (1 1/4') ''acqua system''","UN",748.4],["02.43.0450","TEE PPTF 32 (1 1/4') ''tubo fusion''","UN",717.22],["02.43.0451","TEE PPTF 40 (1 1/2) ''tubo fusion''","UN",1266.5],["02.43.0519","TEE PPTF 50 (2') ''tubo fusion''","UN",2617.58],["02.43.0520","TEE PPTF 63 (2 ½) ''tubo fusion''","UN",4086.41],["10.50.0023","TEFLON ALTA DENSIDAD 1/2X40mts","UN",2158.38],["02.50.0001","TEFLON ALTA DENSIDAD 3/4X10mts 'tg plast'","UN",1207.05],["02.50.0066","TEFLON ALTA DENSIDAD 3/4X40mts","UN",4723.74],["02.14.0073","TEJA colonial","UN",1300.0],["02.16.0610","TERMINAL DE COBRE ESTAÑADO 10mm ojal x 3/16'","UN",570.0],["02.16.0609","TERMINAL DE COBRE ESTAÑADO 25mm ojal x 5/16'","UN",800.0],["02.16.0581","TERMINAL DE COBRE ESTAÑADO 4mm ojal x 3/16'","UN",205.41],["02.16.0608","TERMINAL DE COBRE ESTAÑADO 50mm ojal x 5/16'","UN",1600.0],["02.16.0611","TERMINAL DE COBRE ESTAÑADO 6mm ojal x 3/16'","UN",300.0],["02.16.0205","TERMINAL DE COBRE ESTAÑADO 70mm ojal x 5/16'","UN",2500.0],["02.16.0614","TERMINAL PUNTERA hueca tubular tif 50mm x unid (10/50/100/20","UN",375.0],["02.16.0615","TERMINAL PUNTERA hueca tubular tif 70mm x unid (10/50/100/20","UN",1500.0],["02.45.0006","TERMOTANQUE ELECTRICO 120lts alta recuperacion 'heineken'","UN",294918.0],["02.45.0004","TERMOTANQUE ELECTRICO 50lts alta recuperación 'heineken'","UN",315073.2],["02.40.0012","TIERRA NEGRA x m3","M3",30000.0],["02.26.0206","TIRAFONDO 1/4''x2 1/2'' + TARUGO 10mm","UN",187.6],["02.26.0096","TIRAFONDO 5/16''x2 1/2'' + TARUGO 12mm","UN",274.0],["02.16.0546","TOMA capsulado exterior c/neutro 10 amp","UN",620000.0],["02.50.0065","TORNILLO + TARUGO (KIT) de 6mm","UN",56.58],["02.13.0043","TORNILLO + TARUGO (KIT) de 8mm","UN",44.07],["02.12.0041","TORNILLO AUTOPERFORANTE chapa 14 x 2 1/2'' cabeza hexagonal/","UN",111.06],["02.12.0037","TORNILLO AUTOPERFORANTE chapa 14 x 3'' cabeza hexagonal/punt","UN",125.66],["02.12.0022","TORNILLO AUTOPERFORANTE para hierro 14 x 2 1/2'' cabeza hexa","UN",142.12],["02.13.0052","TORNILLO AUTOPERFORANTE T1 punta aguja nro8 x1/2' mat: acero","UN",12.13],["02.13.0064","TORNILLO AUTOPERFORANTE T1 punta aguja nro8 x9/16' (14,2mm) ","UN",12.29],["02.13.0063","TORNILLO AUTOPERFORANTE T1 punta mecha nro8 x1' (25,4mm) mat","UN",98.73],["02.13.0042","TORNILLO AUTOPERFORANTE T1 punta mecha nro8 x1/2' (13mm) mat","UN",14.83],["02.13.0062","TORNILLO AUTOPERFORANTE T1 punta mecha nro8 x3/4'' (19mm) ma","UN",20.02],["02.13.0008","TORNILLO AUTOPERFORANTE T1 punta mecha nro8 x9/16' (14mm) ma","UN",13.73],["02.13.0065","TORNILLO AUTOPERFORANTE T2 punta aguja nro6 x1' (25,4mm) mat","UN",7.8],["02.13.0009","TORNILLO AUTOPERFORANTE T2 punta aguja nro6 x1' (25,4mm) tip","UN",13.17],["02.13.0004","TORNILLO AUTOPERFORANTE T2 punta mecha nro8 x1/2' (25mm) mat","UN",116.91],["02.13.0068","TORNILLO AUTOPERFORANTE T3 punta aguja nro6 x1 1/2' (38,1mm)","UN",32.75],["02.31.0095","TORNILLO FIX p/madera 4 x22mm","UN",130.58],["02.31.0084","TORNILLO FIX p/madera 5 x45mm","UN",24.79],["02.43.0318","TORNILLO p/inodoro + TARUGOS Ø8mm","UN",758.43],["02.43.0510","TORNILLO plastico p/mochila","M3",11000.0],["02.32.0013","TRAFORO bacha + griferia","UN",4000.0],["02.16.0369","TRANSFORMADOR c/bornera encapsulado 220/24V-50W (p/automatic","UN",35383.22],["02.23.0002","TRASLADO materiales","UN",100000.0],["02.24.0037","TRASLADO vehiculo/plancha/equipos","UN",600000.0],["02.43.0589","TUBO EXTENSIBLE pvc descarga 40/50mm","UN",2638.88],["02.41.0399","TUBO inserto M (TF/H) 40x1 1/4' 'polimex'","UN",19476.43],["02.17.0001","TUBO LED T8 18w luz dia 1pta 12","UN",1381.86],["02.43.0147","TUBO PPTF H 20x1/2 ''acqua system''","UN",1405.54],["02.43.0273","TUBO PPTF M 20x1/2 ''acqua system''","UN",1752.36],["02.50.0154","UNION DOBLE 1' 'epoxi'","UN",1760.44],["02.43.0526","UNION DOBLE c/rosca H-H PPTF 20 'tubo fusion'","UN",766.66],["02.43.0525","UNION DOBLE con brida 63mm 'tubo fusion'","UN",11230.62],["02.50.0265","UNION DOBLE CONICA HH 3/4' 'epoxi'","UN",1091.65],["02.43.0093","UNION DOBLE PPTF 20","UN",766.66],["02.43.0005","UNION DOBLE PPTF 32","UN",1058.72],["02.16.0370","UNION PVC 3/4'' blanca","UN",96.23],["02.08.0021","VALLA MADERA PERIMETRAL 1.20x1.50mts","UN",21900.0],["02.43.0360","VALVULA AUTOMATICA descarga inodoro bronce + tapa 'piazza'","UN",86824.62],["02.43.0538","VALVULA DE DESCARGA cromo p/inodoro/ modelo: hydra max","UN",100666.22],["02.43.0515","VALVULA DE DESCARGA plastica con flapper","UN",4230.13],["02.43.0560","VALVULA DE DESCARGA plastica de admision 1/2'x10' 250mm","UN",7914.0],["02.43.0574","VALVULA DE DESCARGA plastica p/mochila sin brazo","UN",7358.76],["02.43.0513","VALVULA DE DESCARGA pvc p/mochila con flappers 'ferrum'","UN",477.08],["02.43.0535","VALVULA ESFERICA metalica 40mm 'tubo fusion'","UN",16902.72],["02.43.0536","VALVULA ESFERICA metalica 50mm 'tubo fusion'","UN",25342.49],["02.43.0537","VALVULA ESFERICA metalica 63mm 'tubo fusion'","UN",37895.29],["02.43.0534","VALVULA ESFERICA metalica c/manija 32mm 'tubo fusion'","UN",8858.86],["02.43.0508","VALVULA p/canilla con silicona de 1/2'","UN",596.31],["02.43.0514","VALVULA plastica p/termotanque con grifo de purga a 90°","UN",2249.39],["02.01.0205","Ventana (V10) 2,60 x 0,60 mts / premarco - contramarco tipo:","UN",330690.8],["02.01.0206","Ventana (V11)1,60 x 0,60 mts / premarco - contramarco tipo: ","UN",242435.7],["02.01.0207","Ventana (V12)2,00 x 0,50 mts / premarco - contramarco tipo: ","UN",377476.63],["02.01.0208","Ventana (V13)1,00 x 0,60 mts / premarco - contramarco tipo: ","UN",313677.77],["02.01.0209","Ventana (V14)4,50 x 1,20mts / premarco - contramarco tipo: a","UN",1313193.36],["02.01.0200","Ventana (V5) 1,30 x 0,60mts / premarco - contramarco tipo: a","UN",350893.77],["02.01.0201","Ventana (V6) 2,00 x 0,60mts / premarco - contramarco tipo: a","UN",281778.33],["02.01.0202","Ventana (V7) 2,20 x 0,50mts / premarco -contramarco tipo: al","UN",401401.21],["02.01.0203","Ventana (V8) 1,80 x 0,50mts / premarco - contramarco tipo: a","UN",366843.49],["02.01.0204","Ventana (V9) 1,60 x 1,05mts / premarco - marco tipo: alumini","UN",395552.98],["02.01.0225","VENTANA ALUMINIO (V1) 3.00x1.00mts / Tipo: 2hojas corredizas","UN",632700.0],["02.01.0196","VENTANA ALUMINIO (V1) 5,50 x 1,20mts /premarco y contramarco","UN",1601351.58],["02.01.0197","VENTANA ALUMINIO (V2) 2,65 x 1,20mts / premarco - contramarc","UN",685837.83],["02.01.0226","VENTANA ALUMINIO (V2) 2.80x0.50mts / Tipo: 2hojas corredizas","UN",472500.0],["02.01.0198","VENTANA ALUMINIO (V3) 0,60 X 2,30mts / premarco - contramarc","UN",558240.09],["02.01.0227","VENTANA ALUMINIO (V3) 1.40x0.50mts / Tipo: 2hojas corredizas","UN",549000.0],["02.01.0199","VENTANA ALUMINIO (V4) 2,40 X 0,60mts / premarco - contramarc","UN",309424.51],["02.01.0228","VENTANA ALUMINIO (V4) 2.00x2.45mts / Tipo: 2hojas brazo de e","UN",1089000.0],["02.01.0229","VENTANA ALUMINIO (V5) 1.00x1.00mts / Tipo: 1hoja brazo de em","UN",364500.0],["02.01.0230","VENTANA ALUMINIO (V6) 2.80x0.50mts / Tipo: 2hojas brazo de e","UN",702000.0],["02.01.0231","VENTANA ALUMINIO (V7) 2.00x1.00mts / Tipo: 2hojas corredizas","UN",423000.0],["02.01.0232","VENTANA ALUMINIO (V8) 1.00x0.50mts / Tipo: 2hojas corredizas","UN",265500.0],["02.52.0016","VIDRIO ARMADO (malla de alambre 6mm de12x12mm)","M2",84403.21],["02.52.0009","VIDRIO LAMINADO 3+3 blisan","M2",89399.24],["02.10.0006","VINILO autoadhesivo impreso xm2","M2",63043.48],["02.43.0564","VOLANTE p/griferia tipo allegro pvc cromado","UN",7012.06],["02.53.0013","VOLQUETE (5m3) Caba","M3",21400.0],["02.53.0011","VOLQUETE (5m3) Ensenada","M3",24000.0],["02.53.0010","VOLQUETE (5m3) Gral Rodriguez","M3",17000.0],["02.53.0012","VOLQUETE (5m3) La Plata","M3",14000.0],["02.53.0009","VOLQUETE (5m3) Merlo","M3",15400.0],["02.53.0008","VOLQUETE (5m3) Pilar","M3",18000.0],["02.14.0063","YESO PROYECTABLE x30kg ''tuyango''","KG",475.29],["02.14.0077","YESO TIPO PARIS x10kg (comun)","KG",220.92],["02.26.0051","YESO TIPO PARIS x1kg (comun) ''revokito''","KG",1573.55],["02.14.0075","YESO TIPO PARIS x2kg (comun)","KG",1449.18],["02.14.0071","YESO TIPO PARIS x4kg (comun)","KG",1356.82],["02.13.0026","YESO TRADICIONAL de obra x25kg 'knauf'","KG",289.71],["02.14.0016","YESO TRADICIONAL x30kg ''tuyango''","KG",475.29],["02.14.0083","YESO TRADICIONAL x40kg ''corral''","KG",232.76],["02.16.0090","ZAPATILLA ELECTRICA 5 bocas 'sica'","UN",10250.0]];

const BASE = BASE_RAW.map(([c,d,u,p])=>({codigo:c,desc:d,um:u,precio:p}));

// ─── RENDIMIENTOS ESTÁNDAR (unidad/m² o unidad/m³ según ítem) ────────────────
const RENDIMIENTOS = {
  "KG": { ref: 25, label: "kg/m²" },
  "M2": { ref: 1,  label: "m²/m²" },
  "M3": { ref: 0.05, label: "m³/m²" },
  "UN": { ref: null, label: null },
  "LTS": { ref: 0.3, label: "lts/m²" },
  "GL":  { ref: null, label: null },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const storage = {
  async get(key) {
    try {
      const docRef = doc(db, "sistema", key);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { value: docSnap.data().datosJSON };
      }
      return { value: null };
    } catch (error) {
      console.error("Error leyendo de Firebase:", error);
      return { value: null };
    }
  },
  async set(key, value) {
    try {
      const docRef = doc(db, "sistema", key);
      await setDoc(docRef, { datosJSON: value });
    } catch (error) {
      console.error("Error guardando en Firebase:", error);
    }
  }
};
const ars = n => new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(n);
const uid = () => Math.random().toString(36).slice(2,9);
const today = () => new Date().toISOString().slice(0,10);

// Resuelve el precio vigente de un ítem: si hay actualización manual, devuelve ese; si no, el de base
function precioVigente(codigo, precioBase, preciosActualizados) {
  const upd = preciosActualizados?.[codigo];
  if (upd && upd.length > 0) return upd[upd.length - 1].precio;
  return precioBase;
}

function semaforo(consumidoReal, cantPresup) {
  if (!consumidoReal || !cantPresup || cantPresup === 0) return null;
  const pct = consumidoReal / cantPresup;
  if (pct <= 0.85) return "verde";
  if (pct <= 1.0)  return "amarillo";
  return "rojo";
}

const COLORS = {
  // Choix brand colors (from brochure)
  bg: "#0f1210", card: "#141a16", border: "#1e2a22",
  gold: "#1A9B7B",       // Choix teal green — replaces gold throughout
  goldDim: "#1A9B7B22",
  text: "#d8e4de", muted: "#4a6055", subtle: "#182018",
  verde: "#22c55e", amarillo: "#f59e0b", rojo: "#ef4444",
  blue: "#3b9b82", purple: "#5b8a7b",
  // Logo accent
  teal: "#1A9B7B", tealDark: "#127a60", tealDim: "#1A9B7B18",
};

const S = {
  app: { minHeight:"auto", background:COLORS.bg, fontFamily:"'Inter', 'Segoe UI', Arial, sans-serif", color:COLORS.text, fontSize:"13px" },
  panel: { background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:"10px", padding:"16px" },
  input: { background:COLORS.subtle, border:`1px solid ${COLORS.border}`, borderRadius:"6px", color:COLORS.text, padding:"7px 10px", fontFamily:"inherit", fontSize:"12px", outline:"none", width:"100%", boxSizing:"border-box" },
  btn: (v="gold",sm=false) => ({ background: v==="gold"?COLORS.gold:v==="red"?"#ef444420":v==="blue"?"#3b82f620":"transparent", color: v==="gold"?COLORS.bg:v==="red"?COLORS.rojo:v==="blue"?COLORS.blue:COLORS.muted, border: v==="gold"?"none":`1px solid ${v==="red"?COLORS.rojo:v==="blue"?COLORS.blue:COLORS.border}`, borderRadius:"6px", padding: sm?"4px 10px":"7px 14px", fontSize: sm?"11px":"12px", fontFamily:"inherit", fontWeight:700, cursor:"pointer", letterSpacing:"0.04em" }),
  tag: (c) => ({ background:`${c}18`, color:c, border:`1px solid ${c}40`, borderRadius:"4px", padding:"2px 7px", fontSize:"10px", fontWeight:700, letterSpacing:"0.06em" }),
  label: { fontSize:"10px", color:COLORS.muted, letterSpacing:"0.08em", marginBottom:"4px", display:"block", textTransform:"uppercase" },
  th: { padding:"8px 10px", textAlign:"left", fontSize:"10px", color:COLORS.muted, letterSpacing:"0.08em", textTransform:"uppercase", borderBottom:`1px solid ${COLORS.border}`, whiteSpace:"nowrap" },
  td: { padding:"7px 10px", borderBottom:`1px solid ${COLORS.border}15`, verticalAlign:"middle" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
function PresupuestosModule() {
  const [proyectos, setProyectos] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [view, setView] = useState("lista"); // lista | proyecto | nuevo
  const [storageReady, setStorageReady] = useState(false);
  // preciosActualizados: { [codigo]: [{precio, fecha, nota}] }
  const [preciosActualizados, setPreciosActualizados] = useState({});

  // Load from storage
  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get("choix_proyectos");
        if (r?.value) setProyectos(JSON.parse(r.value));
      } catch {}
      try {
        const r2 = await storage.get("choix_precios");
        if (r2?.value) setPreciosActualizados(JSON.parse(r2.value));
      } catch {}
      setStorageReady(true);
    })();
  }, []);

  // Save proyectos to storage
  useEffect(() => {
    if (!storageReady) return;
    (async () => {
      try { await storage.set("choix_proyectos", JSON.stringify(proyectos)); } catch {}
    })();
  }, [proyectos, storageReady]);

  // Save precios to storage
  useEffect(() => {
    if (!storageReady) return;
    (async () => {
      try { await storage.set("choix_precios", JSON.stringify(preciosActualizados)); } catch {}
    })();
  }, [preciosActualizados, storageReady]);

  const activeProyecto = proyectos.find(p => p.id === activeId);

  function crearProyecto(data) {
    const np = { id: uid(), ...data, iccPct: data.iccPct||15, items: [], creadoEn: today() };
    setProyectos(ps => [...ps, np]);
    setActiveId(np.id);
    setView("proyecto");
  }

  function updateProyecto(id, patch) {
    setProyectos(ps => ps.map(p => p.id===id ? {...p,...patch} : p));
  }

  function deleteProyecto(id) {
    setProyectos(ps => ps.filter(p => p.id!==id));
    if (activeId===id) { setActiveId(null); setView("lista"); }
  }

  if (!storageReady) return <div style={{...S.app, display:"flex", alignItems:"center", justifyContent:"center"}}><span style={{color:COLORS.muted}}>Cargando...</span></div>;

  return (
    <div style={{...S.app, height:"100%", overflow:"auto"}}>
      <div style={{padding:"16px", maxWidth:"1200px", margin:"0 auto"}}>
        {view==="lista" && <ListaProyectos proyectos={proyectos} preciosActualizados={preciosActualizados} setActiveId={setActiveId} setView={setView} deleteProyecto={deleteProyecto} />}
        {view==="nuevo" && <NuevoProyecto onCrear={crearProyecto} onCancel={()=>setView("lista")} />}
        {view==="proyecto" && activeProyecto && <VistaProyecto proyecto={activeProyecto} updateProyecto={updateProyecto} preciosActualizados={preciosActualizados} />}
        {view==="precios" && <GestorPrecios preciosActualizados={preciosActualizados} setPreciosActualizados={setPreciosActualizados} />}
      </div>
    </div>
  );
}

// ─── TOP BAR ─────────────────────────────────────────────────────────────────
function TopBar({view, setView, activeProyecto, setActiveId}) {
  return (
    <div style={{background:COLORS.card, borderBottom:`2px solid ${COLORS.teal}`, padding:"10px 20px", display:"flex", alignItems:"center", gap:"14px", position:"sticky", top:0, zIndex:100}}>
      {/* Choix Logo */}
      <div style={{display:"flex", flexDirection:"column", cursor:"pointer", lineHeight:1, userSelect:"none"}} onClick={()=>setView("lista")}>
        <span style={{fontSize:"9px", color:COLORS.muted, letterSpacing:"0.25em", fontFamily:"sans-serif", fontWeight:400, marginBottom:"1px"}}>CONSTRUCTORA</span>
        <div style={{display:"flex", alignItems:"center", gap:"0px"}}>
          <span style={{fontFamily:"'Arial Black', 'Impact', sans-serif", fontWeight:900, fontSize:"22px", color:COLORS.text, letterSpacing:"-0.02em", lineHeight:1}}>CHOI</span>
          {/* Stylized X with teal accent */}
          <svg width="18" height="22" viewBox="0 0 18 22" style={{display:"inline-block", marginBottom:"1px"}}>
            <line x1="1" y1="1" x2="17" y2="21" stroke={COLORS.teal} strokeWidth="3.5" strokeLinecap="round"/>
            <line x1="17" y1="1" x2="1" y2="21" stroke={COLORS.text} strokeWidth="3.5" strokeLinecap="round"/>
          </svg>
        </div>
        {/* Teal underline */}
        <div style={{height:"2px", background:COLORS.teal, borderRadius:"1px", marginTop:"2px"}}></div>
      </div>

      <div style={{width:"1px", height:"30px", background:COLORS.border}}></div>
      <span style={{color:COLORS.muted, fontSize:"11px", letterSpacing:"0.08em"}}>SISTEMA DE PRESUPUESTOS</span>

      {activeProyecto && view==="proyecto" && (
        <>
          <span style={{color:COLORS.border}}>›</span>
          <span style={{color:COLORS.text, fontSize:"12px"}}>{activeProyecto.codigo} — {activeProyecto.nombre}</span>
        </>
      )}
      <div style={{marginLeft:"auto", display:"flex", gap:"8px"}}>
        {view!=="nuevo" && <button style={S.btn("gold",true)} onClick={()=>setView("nuevo")}>+ NUEVA OBRA</button>}
        <button style={S.btn(view==="precios"?"gold":"",true)} onClick={()=>setView("precios")}>💲 PRECIOS</button>
        {view!=="lista" && view!=="precios" && <button style={S.btn("",true)} onClick={()=>setView("lista")}>← OBRAS</button>}
        {view==="precios" && <button style={S.btn("",true)} onClick={()=>setView("lista")}>← OBRAS</button>}
      </div>
    </div>
  );
}

// ─── LISTA DE PROYECTOS ───────────────────────────────────────────────────────
function ListaProyectos({proyectos, preciosActualizados, setActiveId, setView, deleteProyecto}) {
  if (proyectos.length===0) return (
    <div style={{textAlign:"center", padding:"60px 20px"}}>
      <div style={{fontSize:"40px", marginBottom:"12px"}}>🏗️</div>
      <div style={{color:COLORS.muted, marginBottom:"20px"}}>No hay obras todavía. Creá la primera.</div>
      <button style={S.btn()} onClick={()=>setView("nuevo")}>+ NUEVA OBRA</button>
    </div>
  );
  return (
    <div>
      <div style={{marginBottom:"16px", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
        <span style={{color:COLORS.muted, fontSize:"11px"}}>{proyectos.length} OBRA{proyectos.length!==1?"S":""}</span>
      </div>
      <div style={{display:"grid", gap:"10px", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))"}}>
        {proyectos.map(p => {
          const total = p.items.reduce((s,i)=>s + i.cantPresup*(i.precioCustom??precioVigente(i.codigo, i.precioBase, preciosActualizados))*(1+p.iccPct/100),0);
          const alertas = p.items.filter(i=>semaforo(i.consumidoReal,i.cantPresup)==="rojo").length;
          return (
            <div key={p.id} style={{...S.panel, cursor:"pointer", transition:"border .15s"}}
              onClick={()=>{setActiveId(p.id);setView("proyecto");}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px"}}>
                <div>
                  <div style={{fontWeight:700, color:COLORS.gold, fontSize:"12px"}}>{p.codigo}</div>
                  <div style={{fontWeight:700, fontSize:"14px", marginTop:"2px"}}>{p.nombre}</div>
                  <div style={{color:COLORS.muted, fontSize:"11px", marginTop:"2px"}}>{p.cliente}</div>
                </div>
                <button style={{...S.btn("red",true), padding:"3px 7px"}} onClick={e=>{e.stopPropagation();deleteProyecto(p.id)}}>✕</button>
              </div>
              <div style={{display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"10px"}}>
                <span style={S.tag(COLORS.blue)}>{p.items.length} ítems</span>
                {alertas>0 && <span style={S.tag(COLORS.rojo)}>⚠ {alertas} alerta{alertas!==1?"s":""}</span>}
                <span style={S.tag(COLORS.muted)}>ICC +{p.iccPct}%</span>
              </div>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <span style={{color:COLORS.muted, fontSize:"10px"}}>{p.fechaInicio} → {p.fechaFin}</span>
                <span style={{fontWeight:700, color:COLORS.gold, fontSize:"14px"}}>{ars(total)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── NUEVO PROYECTO ───────────────────────────────────────────────────────────
function NuevoProyecto({onCrear, onCancel}) {
  const [form, setForm] = useState({ codigo:"OBR-001", nombre:"", cliente:"", fechaInicio:today(), fechaFin:"", iccPct:"15" });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const ok = form.nombre && form.cliente && form.fechaInicio;
  return (
    <div style={{...S.panel, maxWidth:"500px", margin:"0 auto"}}>
      <div style={{fontWeight:800, color:COLORS.gold, marginBottom:"20px", fontSize:"14px"}}>NUEVA OBRA</div>
      <div style={{display:"grid", gap:"14px"}}>
        {[["Código de obra","codigo","text"],["Nombre de obra","nombre","text"],["Cliente / Comitente","cliente","text"],["Fecha inicio","fechaInicio","date"],["Fecha fin estimada","fechaFin","date"]].map(([lbl,key,type])=>(
          <div key={key}>
            <label style={S.label}>{lbl}</label>
            <input style={S.input} type={type} value={form[key]} onChange={e=>set(key,e.target.value)} />
          </div>
        ))}
        <div>
          <label style={S.label}>Ajuste ICC propio ({form.iccPct}%)</label>
          <input style={S.input} type="range" min="0" max="60" step="0.5" value={form.iccPct} onChange={e=>set("iccPct",e.target.value)} />
          <div style={{color:COLORS.gold, fontSize:"11px", marginTop:"3px"}}>Factor acumulado: ×{(1+form.iccPct/100).toFixed(3)} sobre precios ago-2025</div>
        </div>
      </div>
      <div style={{display:"flex", gap:"10px", marginTop:"20px"}}>
        <button style={S.btn()} disabled={!ok} onClick={()=>onCrear({...form,iccPct:parseFloat(form.iccPct)})}>CREAR OBRA</button>
        <button style={S.btn("",false)} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISTA PROYECTO
// ═══════════════════════════════════════════════════════════════════════════════
function VistaProyecto({proyecto, updateProyecto, preciosActualizados}) {
  const [tab, setTab] = useState("presupuesto"); // presupuesto | semaforo | config
  const iccFactor = 1 + proyecto.iccPct / 100;

  function addItems(newItems) {
    const existing = new Set(proyecto.items.map(i=>i.codigo));
    const toAdd = newItems.filter(i=>!existing.has(i.codigo));
    updateProyecto(proyecto.id, { items:[...proyecto.items, ...toAdd] });
  }
  function updateItem(codigo, patch) {
    updateProyecto(proyecto.id, { items: proyecto.items.map(i=>i.codigo===codigo?{...i,...patch}:i) });
  }
  function removeItem(codigo) {
    updateProyecto(proyecto.id, { items: proyecto.items.filter(i=>i.codigo!==codigo) });
  }

  const totalPresup = proyecto.items.reduce((s,i)=>s + i.cantPresup*(i.precioCustom??precioVigente(i.codigo, i.precioBase, preciosActualizados))*iccFactor,0);
  const alertasRojo = proyecto.items.filter(i=>semaforo(i.consumidoReal,i.cantPresup)==="rojo").length;

  return (
    <div>
      {/* Header obra */}
      <div style={{...S.panel, marginBottom:"14px"}}>
        <div style={{display:"flex", flexWrap:"wrap", gap:"16px", justifyContent:"space-between", alignItems:"center"}}>
          <div>
            <div style={{display:"flex", alignItems:"center", gap:"10px"}}>
              <span style={{fontWeight:800, color:COLORS.gold, fontSize:"16px"}}>{proyecto.codigo}</span>
              <span style={{fontWeight:700, fontSize:"15px"}}>{proyecto.nombre}</span>
            </div>
            <div style={{color:COLORS.muted, fontSize:"11px", marginTop:"3px"}}>{proyecto.cliente} · {proyecto.fechaInicio} → {proyecto.fechaFin} · ICC +{proyecto.iccPct}%</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:"10px", color:COLORS.muted, letterSpacing:"0.08em"}}>TOTAL PRESUPUESTO</div>
            <div style={{fontWeight:800, color:COLORS.gold, fontSize:"22px"}}>{ars(totalPresup)}</div>
            <div style={{display:"flex", gap:"6px", justifyContent:"flex-end", marginTop:"4px"}}>
              <span style={S.tag(COLORS.blue)}>{proyecto.items.length} ítems</span>
              {alertasRojo>0 && <span style={S.tag(COLORS.rojo)}>⚠ {alertasRojo} sobre rendimiento</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex", gap:"4px", marginBottom:"14px"}}>
        {[["presupuesto","📋 Presupuesto"],["semaforo","🚦 Semáforo"],["ia","🤖 IA / Pliego"],["config","⚙ Config"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{...S.btn(tab===t?"gold":"",true), borderRadius:"6px 6px 0 0"}}>{l}</button>
        ))}
      </div>

      {tab==="presupuesto" && <TabPresupuesto proyecto={proyecto} iccFactor={iccFactor} addItems={addItems} updateItem={updateItem} removeItem={removeItem} preciosActualizados={preciosActualizados} />}
      {tab==="semaforo" && <TabSemaforo proyecto={proyecto} iccFactor={iccFactor} updateItem={updateItem} preciosActualizados={preciosActualizados} />}
      {tab==="ia" && <TabIA proyecto={proyecto} addItems={addItems} />}
      {tab==="config" && <TabConfig proyecto={proyecto} updateProyecto={updateProyecto} />}
    </div>
  );
}

// ─── TAB PRESUPUESTO ──────────────────────────────────────────────────────────
function TabPresupuesto({proyecto, iccFactor, addItems, updateItem, removeItem, preciosActualizados}) {
  const [search, setSearch] = useState("");
  const [showSelector, setShowSelector] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customItem, setCustomItem] = useState({desc:"",um:"UN",cantPresup:"1",precioCustom:""});

  const total = proyecto.items.reduce((s,i)=>s+i.cantPresup*(i.precioCustom??precioVigente(i.codigo, i.precioBase, preciosActualizados))*iccFactor,0);

  function addCustom() {
    if (!customItem.desc) return;
    addItems([{ codigo:"CUSTOM-"+uid(), desc:customItem.desc, um:customItem.um, precioBase:0, precioCustom:parseFloat(customItem.precioCustom)||0, cantPresup:parseFloat(customItem.cantPresup)||1, consumidoReal:0, esCustom:true }]);
    setCustomItem({desc:"",um:"UN",cantPresup:"1",precioCustom:""});
    setShowCustom(false);
  }

  const filtered = proyecto.items.filter(i=>i.desc.toLowerCase().includes(search.toLowerCase())||i.codigo.includes(search));

  return (
    <div style={{...S.panel}}>
      {/* Toolbar */}
      <div style={{display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"14px", alignItems:"center"}}>
        <input style={{...S.input, maxWidth:"280px"}} placeholder="Buscar ítem..." value={search} onChange={e=>setSearch(e.target.value)} />
        <button style={S.btn("gold",true)} onClick={()=>setShowSelector(!showSelector)}>+ DE BASE</button>
        <button style={S.btn("blue",true)} onClick={()=>setShowCustom(!showCustom)}>+ ÍTEM CUSTOM</button>
        <span style={{marginLeft:"auto", fontWeight:700, color:COLORS.gold, fontSize:"14px"}}>{ars(total)}</span>
      </div>

      {/* Selector de base */}
      {showSelector && <SelectorBase onAdd={(items)=>{addItems(items);setShowSelector(false);}} existentes={proyecto.items.map(i=>i.codigo)} />}

      {/* Ítem custom */}
      {showCustom && (
        <div style={{background:COLORS.subtle, borderRadius:"8px", padding:"12px", marginBottom:"12px", display:"flex", gap:"10px", flexWrap:"wrap", alignItems:"flex-end"}}>
          <div style={{flex:2, minWidth:"200px"}}>
            <label style={S.label}>Descripción</label>
            <input style={S.input} value={customItem.desc} onChange={e=>setCustomItem(c=>({...c,desc:e.target.value}))} />
          </div>
          <div style={{width:"80px"}}>
            <label style={S.label}>UM</label>
            <select style={S.input} value={customItem.um} onChange={e=>setCustomItem(c=>({...c,um:e.target.value}))}>
              {["UN","KG","M2","M3","LTS","GL"].map(u=><option key={u}>{u}</option>)}
            </select>
          </div>
          <div style={{width:"90px"}}>
            <label style={S.label}>Cantidad</label>
            <input style={S.input} type="number" value={customItem.cantPresup} onChange={e=>setCustomItem(c=>({...c,cantPresup:e.target.value}))} />
          </div>
          <div style={{width:"130px"}}>
            <label style={S.label}>Precio unit ($)</label>
            <input style={S.input} type="number" value={customItem.precioCustom} onChange={e=>setCustomItem(c=>({...c,precioCustom:e.target.value}))} />
          </div>
          <button style={S.btn("gold",true)} onClick={addCustom}>Agregar</button>
          <button style={S.btn("",true)} onClick={()=>setShowCustom(false)}>✕</button>
        </div>
      )}

      {/* Tabla */}
      {proyecto.items.length===0 ? (
        <div style={{textAlign:"center", padding:"40px", color:COLORS.muted}}>Sin ítems. Agregá desde la base o usá la IA para leer un pliego.</div>
      ) : (
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%", borderCollapse:"collapse"}}>
            <thead>
              <tr>
                {["Código","Descripción","UM","Cant. Presup.","P. Base","P. Custom","P. Final+ICC","Consumido","Semáf.",""].map(h=>(
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item=>{
                const pVigente = precioVigente(item.codigo, item.precioBase, preciosActualizados);
                const precio = item.precioCustom ?? pVigente;
                const precioFinal = precio * iccFactor;
                const subtotal = item.cantPresup * precioFinal;
                const sem = semaforo(item.consumidoReal, item.cantPresup);
                const tieneActualizacion = preciosActualizados?.[item.codigo]?.length > 0;
                const semColor = sem==="verde"?COLORS.verde:sem==="amarillo"?COLORS.amarillo:sem==="rojo"?COLORS.rojo:COLORS.muted;
                return (
                  <tr key={item.codigo}>
                    <td style={{...S.td, color:COLORS.muted, fontSize:"11px", whiteSpace:"nowrap"}}>{item.codigo}</td>
                    <td style={{...S.td, maxWidth:"220px"}}>
                      <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:"12px"}} title={item.desc}>{item.desc}</div>
                      {item.esCustom && <span style={S.tag(COLORS.purple)}>CUSTOM</span>}
                    </td>
                    <td style={{...S.td, textAlign:"center", color:COLORS.muted}}>{item.um}</td>
                    <td style={S.td}>
                      <input type="number" style={{...S.input, width:"80px", textAlign:"right"}} value={item.cantPresup}
                        onChange={e=>updateItem(item.codigo,{cantPresup:parseFloat(e.target.value)||0})} />
                    </td>
                    <td style={{...S.td, fontSize:"11px", textAlign:"right", whiteSpace:"nowrap"}}>
                      <div style={{color: tieneActualizacion ? COLORS.verde : COLORS.muted}}>
                        {ars(pVigente)}
                        {tieneActualizacion && <span title="Precio actualizado manualmente" style={{marginLeft:"4px"}}>✎</span>}
                      </div>
                      {tieneActualizacion && <div style={{color:COLORS.muted, fontSize:"10px", textDecoration:"line-through"}}>{ars(item.precioBase)}</div>}
                    </td>
                    <td style={S.td}>
                      <input type="number" placeholder="—" style={{...S.input, width:"100px", textAlign:"right", color:item.precioCustom!=null?COLORS.gold:COLORS.muted}}
                        value={item.precioCustom??""} onChange={e=>updateItem(item.codigo,{precioCustom:e.target.value===""?null:parseFloat(e.target.value)})} />
                    </td>
                    <td style={{...S.td, textAlign:"right", fontWeight:700, color:COLORS.gold, whiteSpace:"nowrap"}}>{ars(subtotal)}</td>
                    <td style={S.td}>
                      <input type="number" placeholder="0" style={{...S.input, width:"80px", textAlign:"right"}}
                        value={item.consumidoReal??""} onChange={e=>updateItem(item.codigo,{consumidoReal:parseFloat(e.target.value)||0})} />
                    </td>
                    <td style={{...S.td, textAlign:"center"}}>
                      {sem ? <span style={{fontSize:"16px"}} title={`${((item.consumidoReal/item.cantPresup)*100).toFixed(0)}% consumido`}>{sem==="verde"?"🟢":sem==="amarillo"?"🟡":"🔴"}</span> : <span style={{color:COLORS.muted}}>—</span>}
                    </td>
                    <td style={S.td}>
                      <button style={{...S.btn("red",true), padding:"2px 7px"}} onClick={()=>removeItem(item.codigo)}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{borderTop:`2px solid ${COLORS.border}`}}>
                <td colSpan={6} style={{...S.td, fontWeight:700, color:COLORS.muted, fontSize:"11px", textAlign:"right", paddingTop:"12px"}}>TOTAL PRESUPUESTO</td>
                <td style={{...S.td, fontWeight:800, color:COLORS.gold, fontSize:"15px", paddingTop:"12px", whiteSpace:"nowrap"}}>{ars(proyecto.items.reduce((s,i)=>s+i.cantPresup*(i.precioCustom??precioVigente(i.codigo, i.precioBase, preciosActualizados))*iccFactor,0))}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── SELECTOR BASE ────────────────────────────────────────────────────────────
function SelectorBase({onAdd, existentes}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(new Set());

  const results = useMemo(()=>{
    if (q.length<2) return [];
    return BASE.filter(b=>b.desc.toLowerCase().includes(q.toLowerCase())||b.codigo.includes(q)).slice(0,40);
  },[q]);

  function toggle(codigo) {
    setSel(s=>{ const ns=new Set(s); ns.has(codigo)?ns.delete(codigo):ns.add(codigo); return ns; });
  }

  function confirmar() {
    const items = BASE.filter(b=>sel.has(b.codigo)).map(b=>({
      codigo:b.codigo, desc:b.desc, um:b.um,
      precioBase:b.precio, precioCustom:null,
      cantPresup:1, consumidoReal:0, esCustom:false
    }));
    onAdd(items);
  }

  return (
    <div style={{background:COLORS.subtle, borderRadius:"8px", padding:"12px", marginBottom:"12px"}}>
      <div style={{display:"flex", gap:"8px", marginBottom:"10px", alignItems:"center"}}>
        <input style={{...S.input, maxWidth:"320px"}} placeholder="Buscar en base (948 ítems)..." value={q} onChange={e=>setQ(e.target.value)} autoFocus />
        {sel.size>0 && <button style={S.btn("gold",true)} onClick={confirmar}>Agregar {sel.size} ítem{sel.size!==1?"s":""}</button>}
      </div>
      <div style={{maxHeight:"260px", overflowY:"auto"}}>
        {results.map(b=>{
          const ya = existentes.includes(b.codigo);
          const checked = sel.has(b.codigo);
          return (
            <div key={b.codigo} onClick={()=>!ya&&toggle(b.codigo)}
              style={{display:"flex", alignItems:"center", gap:"10px", padding:"6px 8px", borderRadius:"5px", cursor:ya?"default":"pointer", background:checked?COLORS.goldDim:"transparent", opacity:ya?0.4:1, marginBottom:"2px"}}>
              <input type="checkbox" checked={checked||ya} readOnly style={{accentColor:COLORS.gold}} />
              <span style={{color:COLORS.muted, fontSize:"10px", minWidth:"80px"}}>{b.codigo}</span>
              <span style={{flex:1, fontSize:"12px"}}>{b.desc}</span>
              <span style={{color:COLORS.muted, fontSize:"10px"}}>{b.um}</span>
              <span style={{color:COLORS.gold, fontSize:"11px", fontWeight:700, minWidth:"90px", textAlign:"right"}}>{ars(b.precio)}</span>
              {ya && <span style={S.tag(COLORS.muted)}>YA</span>}
            </div>
          );
        })}
        {q.length>=2 && results.length===0 && <div style={{color:COLORS.muted, padding:"12px", textAlign:"center"}}>Sin resultados</div>}
        {q.length<2 && <div style={{color:COLORS.muted, padding:"12px", textAlign:"center", fontSize:"11px"}}>Escribí al menos 2 caracteres para buscar</div>}
      </div>
    </div>
  );
}

// ─── TAB SEMÁFORO ─────────────────────────────────────────────────────────────
function TabSemaforo({proyecto, iccFactor, updateItem, preciosActualizados}) {
  const items = proyecto.items;
  const rojos   = items.filter(i=>semaforo(i.consumidoReal,i.cantPresup)==="rojo");
  const amarillos = items.filter(i=>semaforo(i.consumidoReal,i.cantPresup)==="amarillo");
  const verdes  = items.filter(i=>semaforo(i.consumidoReal,i.cantPresup)==="verde");
  const sinDato = items.filter(i=>!semaforo(i.consumidoReal,i.cantPresup));

  if (items.length===0) return <div style={{...S.panel, color:COLORS.muted, textAlign:"center", padding:"40px"}}>No hay ítems en el presupuesto</div>;

  function SemGroup({label, color, emoji, list}) {
    if (list.length===0) return null;
    return (
      <div style={{marginBottom:"16px"}}>
        <div style={{fontWeight:700, color, marginBottom:"8px", fontSize:"12px"}}>{emoji} {label} ({list.length})</div>
        <table style={{width:"100%", borderCollapse:"collapse"}}>
          <thead><tr>{["Código","Descripción","UM","Presup.","Consumido","% Uso"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {list.map(item=>{
              const pct = item.consumidoReal&&item.cantPresup ? (item.consumidoReal/item.cantPresup*100).toFixed(1) : "—";
              return (
                <tr key={item.codigo}>
                  <td style={{...S.td, color:COLORS.muted, fontSize:"11px"}}>{item.codigo}</td>
                  <td style={{...S.td, fontSize:"12px", maxWidth:"250px"}}><div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={item.desc}>{item.desc}</div></td>
                  <td style={{...S.td, textAlign:"center", color:COLORS.muted}}>{item.um}</td>
                  <td style={{...S.td, textAlign:"right"}}>{item.cantPresup}</td>
                  <td style={S.td}>
                    <input type="number" style={{...S.input, width:"80px", textAlign:"right"}} value={item.consumidoReal??""} placeholder="0"
                      onChange={e=>updateItem(item.codigo,{consumidoReal:parseFloat(e.target.value)||0})} />
                  </td>
                  <td style={{...S.td, textAlign:"right"}}>
                    <span style={{fontWeight:700, color, padding:"2px 8px", background:`${color}15`, borderRadius:"4px"}}>{pct}{pct!=="—"?"%":""}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div style={S.panel}>
      <div style={{display:"flex", gap:"10px", marginBottom:"18px", flexWrap:"wrap"}}>
        {[["🔴",COLORS.rojo,rojos.length,"Sobre rendimiento"],["🟡",COLORS.amarillo,amarillos.length,"En límite"],["🟢",COLORS.verde,verdes.length,"OK"],["⚪",COLORS.muted,sinDato.length,"Sin datos"]].map(([e,c,n,l])=>(
          <div key={l} style={{...S.panel, flex:1, minWidth:"100px", textAlign:"center", padding:"12px"}}>
            <div style={{fontSize:"22px"}}>{e}</div>
            <div style={{fontWeight:800, fontSize:"20px", color:c}}>{n}</div>
            <div style={{color:COLORS.muted, fontSize:"10px"}}>{l}</div>
          </div>
        ))}
      </div>
      <SemGroup label="SOBRE RENDIMIENTO — Acción requerida" color={COLORS.rojo} emoji="🔴" list={rojos} />
      <SemGroup label="EN LÍMITE — Monitorear" color={COLORS.amarillo} emoji="🟡" list={amarillos} />
      <SemGroup label="OK — Dentro del presupuesto" color={COLORS.verde} emoji="🟢" list={verdes} />
      <SemGroup label="SIN CONSUMO CARGADO" color={COLORS.muted} emoji="⚪" list={sinDato} />
    </div>
  );
}

// ─── TAB IA / PLIEGO ──────────────────────────────────────────────────────────
function TabIA({proyecto, addItems}) {
  const [pliego, setPliego] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  async function handlePDF(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoadingPdf(true); setError("");
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = () => rej(new Error("Error leyendo PDF"));
        r.readAsDataURL(file);
      });
      const resp = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          messages: [{role:"user", content:[
            {type:"document", source:{type:"base64", media_type:"application/pdf", data: base64}},
            {type:"text", text:"Extraé el texto completo de este pliego de obra o especificación técnica. Devolvé solo el texto, sin comentarios."}
          ]}]
        })
      });
      const data = await resp.json();
      const txt = data.content?.map(c=>c.text||"").join("").trim();
      setPliego(txt);
    } catch(e) { setError("Error al leer PDF: "+e.message); }
    setLoadingPdf(false);
    e.target.value = "";
  }

  async function analizarPliego() {
    if (!(pliego||"").trim()) return;
    setLoading(true); setError(""); setResultado(null);
    const baseResumen = BASE.slice(0,200).map(b=>`${b.codigo}|${b.desc}|${b.um}|${b.precio}`).join("\n");
    try {
      const resp = await fetch("/.netlify/functions/chat",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          messages:[{role:"user",content:`Sos un ingeniero de obra argentino. Analizá el siguiente pliego/descripción de obra y determiná qué materiales son necesarios con sus cantidades estimadas.

Obra: ${proyecto.nombre} (${proyecto.codigo})
Cliente: ${proyecto.cliente}

DESCRIPCIÓN / PLIEGO:
${pliego}

BASE DE MATERIALES DISPONIBLES (primeros 200, formato código|desc|um|precio):
${baseResumen}

Respondé SOLO con JSON válido, sin backticks, sin texto extra:
{"items":[{"codigo":"XX.XX.XXXX","desc":"descripción","um":"UN","cantPresup":10,"precioBase":1000,"justificacion":"por qué se necesita y cómo se calculó la cantidad"}]}

Si algún material necesario no está en la base, incluirlo con codigo "CUSTOM-XXX" y precioBase 0.
Estimá cantidades conservadoras pero realistas. Máximo 20 ítems.`}]
        })
      });
      const data = await resp.json();
      const txt = data.content?.map(c=>c.text||"").join("").trim();
      const parsed = JSON.parse(txt);
      setResultado(parsed.items||[]);
    } catch(e) { setError("Error al analizar: "+e.message); }
    setLoading(false);
  }

  function confirmarItems() {
    const toAdd = resultado.map(r=>({
      codigo: r.codigo, desc:r.desc, um:r.um,
      precioBase: r.precioBase||0, precioCustom:null,
      cantPresup: r.cantPresup, consumidoReal:0,
      esCustom: r.codigo.startsWith("CUSTOM"),
      justificacion: r.justificacion
    }));
    addItems(toAdd);
    setResultado(null); setPliego("");
  }

  return (
    <div style={S.panel}>
      <div style={{fontWeight:700, color:COLORS.gold, marginBottom:"4px", fontSize:"12px"}}>🤖 ANÁLISIS DE PLIEGO CON IA</div>
      <div style={{color:COLORS.muted, fontSize:"11px", marginBottom:"10px"}}>Pegá el texto del pliego, o subí un PDF directamente. La IA identificará los materiales necesarios con cantidades estimadas.</div>
      
      {/* PDF Upload */}
      <div style={{marginBottom:"10px"}}>
        <input ref={fileRef} type="file" accept=".pdf" style={{display:"none"}} onChange={handlePDF} />
        <button style={{...S.btn("blue"), display:"flex", alignItems:"center", gap:"6px"}} onClick={()=>fileRef.current.click()} disabled={loadingPdf}>
          {loadingPdf ? "⏳ Leyendo PDF..." : "📄 SUBIR PDF DEL PLIEGO"}
        </button>
        {pliego && <div style={{fontSize:"10px", color:COLORS.verde, marginTop:"4px"}}>✓ Texto cargado ({pliego.length} caracteres)</div>}
      </div>
      <textarea style={{...S.input, height:"140px", resize:"vertical", lineHeight:"1.5"}}
        placeholder="Ej: Construcción de aulas modulares prefabricadas de 7x9m. Se requiere fundación corrida, estructura metálica, cerramiento perimetral con chapa sinusoidal, cubierta de chapa con aislación, instalación sanitaria completa con 2 baños, instalación eléctrica trifásica..."
        value={pliego} onChange={e=>setPliego(e.target.value)} />
      <button style={{...S.btn(), marginTop:"10px"}} onClick={analizarPliego} disabled={loading||!pliego.trim()}>
        {loading ? "Analizando..." : "ANALIZAR CON IA"}
      </button>
      {error && <div style={{color:COLORS.rojo, marginTop:"10px", fontSize:"12px"}}>{error}</div>}

      {resultado && (
        <div style={{marginTop:"16px"}}>
          <div style={{fontWeight:700, marginBottom:"10px", color:COLORS.gold, fontSize:"12px"}}>Ítems sugeridos por la IA ({resultado.length})</div>
          <table style={{width:"100%", borderCollapse:"collapse", marginBottom:"12px"}}>
            <thead><tr>{["Código","Descripción","UM","Cantidad","Precio ref.","Justificación"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {resultado.map((r,i)=>(
                <tr key={i}>
                  <td style={{...S.td, fontSize:"10px", color:COLORS.muted, whiteSpace:"nowrap"}}>{r.codigo}</td>
                  <td style={{...S.td, fontSize:"12px", maxWidth:"200px"}}><div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={r.desc}>{r.desc}</div></td>
                  <td style={{...S.td, textAlign:"center", color:COLORS.muted}}>{r.um}</td>
                  <td style={{...S.td, textAlign:"right", fontWeight:700}}>{r.cantPresup}</td>
                  <td style={{...S.td, textAlign:"right", color:COLORS.gold, whiteSpace:"nowrap"}}>{ars(r.precioBase)}</td>
                  <td style={{...S.td, fontSize:"11px", color:COLORS.muted, maxWidth:"200px"}}><div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={r.justificacion}>{r.justificacion}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{display:"flex", gap:"8px"}}>
            <button style={S.btn("gold")} onClick={confirmarItems}>CONFIRMAR Y AGREGAR AL PRESUPUESTO</button>
            <button style={S.btn()} onClick={()=>setResultado(null)}>Descartar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GESTOR DE PRECIOS ────────────────────────────────────────────────────────
function GestorPrecios({preciosActualizados, setPreciosActualizados}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null); // item de BASE seleccionado
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [nota, setNota] = useState("");
  const [saved, setSaved] = useState(false);

  const resultados = useMemo(()=>{
    if (search.length < 2) return [];
    return BASE.filter(b=>
      b.desc.toLowerCase().includes(search.toLowerCase()) || b.codigo.includes(search)
    ).slice(0, 50);
  }, [search]);

  // Ítems que ya tienen al menos una actualización
  const actualizados = useMemo(()=>{
    return Object.entries(preciosActualizados)
      .filter(([,hist])=>hist.length>0)
      .map(([codigo, hist])=>{
        const base = BASE.find(b=>b.codigo===codigo);
        return { codigo, desc: base?.desc||codigo, um: base?.um||"", precioBase: base?.precio||0, historial: hist };
      })
      .sort((a,b)=>b.historial[b.historial.length-1].fecha.localeCompare(a.historial[a.historial.length-1].fecha));
  }, [preciosActualizados]);

  function guardarPrecio() {
    if (!selected || !nuevoPrecio) return;
    const entrada = { precio: parseFloat(nuevoPrecio), fecha: today(), nota: nota.trim() };
    setPreciosActualizados(prev => {
      const hist = prev[selected.codigo] || [];
      return { ...prev, [selected.codigo]: [...hist, entrada] };
    });
    setSaved(true);
    setNuevoPrecio(""); setNota("");
    setTimeout(()=>setSaved(false), 2000);
  }

  function eliminarEntrada(codigo, idx) {
    setPreciosActualizados(prev => {
      const hist = [...(prev[codigo]||[])];
      hist.splice(idx, 1);
      if (hist.length === 0) {
        const next = {...prev}; delete next[codigo]; return next;
      }
      return {...prev, [codigo]: hist};
    });
  }

  const countActualizados = Object.keys(preciosActualizados).length;

  return (
    <div>
      <div style={{marginBottom:"14px", display:"flex", alignItems:"center", gap:"12px"}}>
        <span style={{fontWeight:800, color:COLORS.gold, fontSize:"15px"}}>💲 ACTUALIZACIÓN DE PRECIOS</span>
        <span style={S.tag(COLORS.blue)}>{countActualizados} producto{countActualizados!==1?"s":""} actualizados</span>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px", alignItems:"start"}}>

        {/* Panel izquierdo: cargar nuevo precio */}
        <div style={S.panel}>
          <div style={{fontWeight:700, color:COLORS.gold, marginBottom:"12px", fontSize:"12px"}}>CARGAR NUEVO PRECIO</div>
          <label style={S.label}>Buscar producto en la base</label>
          <input style={{...S.input, marginBottom:"10px"}} placeholder="Ej: cemento, hierro, malla..." value={search}
            onChange={e=>{setSearch(e.target.value); setSelected(null); setSaved(false);}} />
          {resultados.length > 0 && !selected && (
            <div style={{background:COLORS.subtle, borderRadius:"6px", maxHeight:"220px", overflowY:"auto", marginBottom:"10px"}}>
              {resultados.map(b=>{
                const vigente = precioVigente(b.codigo, b.precio, preciosActualizados);
                const actualizado = preciosActualizados?.[b.codigo]?.length > 0;
                return (
                  <div key={b.codigo} onClick={()=>{setSelected(b); setSearch(b.desc);}}
                    style={{padding:"7px 10px", cursor:"pointer", borderBottom:`1px solid ${COLORS.border}15`, display:"flex", gap:"10px", alignItems:"center"}}>
                    <span style={{color:COLORS.muted, fontSize:"10px", minWidth:"80px"}}>{b.codigo}</span>
                    <span style={{flex:1, fontSize:"11px"}}>{b.desc}</span>
                    <span style={{color: actualizado?COLORS.verde:COLORS.muted, fontSize:"11px", fontWeight:700}}>{ars(vigente)}</span>
                    {actualizado && <span style={S.tag(COLORS.verde)}>↑</span>}
                  </div>
                );
              })}
            </div>
          )}

          {selected && (
            <div style={{background:COLORS.subtle, borderRadius:"6px", padding:"10px", marginBottom:"12px"}}>
              <div style={{fontSize:"11px", color:COLORS.muted, marginBottom:"2px"}}>{selected.codigo}</div>
              <div style={{fontWeight:700, fontSize:"13px", marginBottom:"6px"}}>{selected.desc}</div>
              <div style={{display:"flex", gap:"16px", fontSize:"11px"}}>
                <div><span style={{color:COLORS.muted}}>Precio original (ago-25): </span><span>{ars(selected.precio)}</span></div>
                <div><span style={{color:COLORS.muted}}>Precio vigente: </span>
                  <span style={{color:COLORS.gold, fontWeight:700}}>{ars(precioVigente(selected.codigo, selected.precio, preciosActualizados))}</span>
                </div>
              </div>
            </div>
          )}

          <div style={{display:"grid", gap:"10px"}}>
            <div>
              <label style={S.label}>Nuevo precio unitario ($)</label>
              <input style={S.input} type="number" placeholder="Ej: 320.00" value={nuevoPrecio}
                onChange={e=>setNuevoPrecio(e.target.value)} disabled={!selected} />
            </div>
            <div>
              <label style={S.label}>Nota (opcional)</label>
              <input style={S.input} placeholder="Ej: Lista feb-26 proveedor X" value={nota}
                onChange={e=>setNota(e.target.value)} disabled={!selected} />
            </div>
            <button style={S.btn("gold")} disabled={!selected||!nuevoPrecio} onClick={guardarPrecio}>
              {saved ? "✓ GUARDADO" : "GUARDAR PRECIO"}
            </button>
            {selected && nuevoPrecio && (
              <div style={{fontSize:"11px", color:COLORS.muted}}>
                Variación vs original: <span style={{color:parseFloat(nuevoPrecio)>selected.precio?COLORS.rojo:COLORS.verde, fontWeight:700}}>
                  {parseFloat(nuevoPrecio)>selected.precio?"+":""}{(((parseFloat(nuevoPrecio)-selected.precio)/selected.precio)*100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Panel derecho: historial de actualizaciones */}
        <div style={S.panel}>
          <div style={{fontWeight:700, color:COLORS.gold, marginBottom:"12px", fontSize:"12px"}}>HISTORIAL DE PRECIOS ACTUALIZADOS</div>
          {actualizados.length === 0 ? (
            <div style={{color:COLORS.muted, textAlign:"center", padding:"30px", fontSize:"12px"}}>
              Todavía no hay precios actualizados.<br/>Buscá un producto a la izquierda y cargá el nuevo precio.
            </div>
          ) : (
            <div style={{display:"flex", flexDirection:"column", gap:"10px", maxHeight:"500px", overflowY:"auto"}}>
              {actualizados.map(item=>{
                const vigente = item.historial[item.historial.length-1];
                const variacion = ((vigente.precio - item.precioBase)/item.precioBase*100).toFixed(1);
                return (
                  <div key={item.codigo} style={{background:COLORS.subtle, borderRadius:"6px", padding:"10px"}}>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"6px"}}>
                      <div>
                        <div style={{fontSize:"10px", color:COLORS.muted}}>{item.codigo} · {item.um}</div>
                        <div style={{fontSize:"12px", fontWeight:600}}>{item.desc}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontWeight:800, color:COLORS.gold}}>{ars(vigente.precio)}</div>
                        <div style={{fontSize:"10px", color: parseFloat(variacion)>0?COLORS.rojo:COLORS.verde}}>
                          {parseFloat(variacion)>0?"+":""}{variacion}% vs original
                        </div>
                      </div>
                    </div>
                    {/* Historial de entradas */}
                    <div style={{borderTop:`1px solid ${COLORS.border}30`, paddingTop:"6px", display:"flex", flexDirection:"column", gap:"3px"}}>
                      {item.historial.map((h, idx)=>(
                        <div key={idx} style={{display:"flex", alignItems:"center", gap:"8px", fontSize:"11px"}}>
                          <span style={{color:COLORS.muted, minWidth:"80px"}}>{h.fecha}</span>
                          <span style={{fontWeight:idx===item.historial.length-1?700:400, color:idx===item.historial.length-1?COLORS.text:COLORS.muted}}>{ars(h.precio)}</span>
                          {h.nota && <span style={{color:COLORS.muted, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>— {h.nota}</span>}
                          {idx===item.historial.length-1 && <span style={S.tag(COLORS.verde)}>VIGENTE</span>}
                          <button onClick={()=>eliminarEntrada(item.codigo, idx)}
                            style={{background:"none", border:"none", color:COLORS.muted, cursor:"pointer", fontSize:"11px", padding:"0 3px"}}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function TabConfig({proyecto, updateProyecto}) {
  const [form, setForm] = useState({...proyecto});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return (
    <div style={{...S.panel, maxWidth:"480px"}}>
      <div style={{fontWeight:700, color:COLORS.gold, marginBottom:"16px", fontSize:"12px"}}>CONFIGURACIÓN DE OBRA</div>
      <div style={{display:"grid", gap:"14px"}}>
        {[["Código","codigo","text"],["Nombre","nombre","text"],["Cliente","cliente","text"],["Fecha inicio","fechaInicio","date"],["Fecha fin","fechaFin","date"]].map(([l,k,t])=>(
          <div key={k}><label style={S.label}>{l}</label><input style={S.input} type={t} value={form[k]||""} onChange={e=>set(k,e.target.value)} /></div>
        ))}
        <div>
          <label style={S.label}>Ajuste ICC ({form.iccPct}%)</label>
          <input style={S.input} type="range" min="0" max="60" step="0.5" value={form.iccPct} onChange={e=>set("iccPct",parseFloat(e.target.value))} />
          <div style={{color:COLORS.gold, fontSize:"11px", marginTop:"3px"}}>×{(1+form.iccPct/100).toFixed(3)} sobre precios ago-2025</div>
        </div>
      </div>
      <button style={{...S.btn(), marginTop:"16px"}} onClick={()=>updateProyecto(proyecto.id, form)}>GUARDAR CAMBIOS</button>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// CHAT IA — MÓDULO AGENTE
// ═══════════════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `Sos "Choix Constructora", una app conversacional de gestión de obra para constructoras en Argentina.

IDENTIDAD Y DOMINIO:
- Especialista en construcción, licitaciones, pliegos, cómputos, presupuestos, compras, certificaciones, QA/QC, SHyMA
- Normativa: Nación Argentina, CABA, PBA
- Temperatura baja (0.3): respuestas técnicas, precisas, sin especulación

ESTILO DE RESPUESTA — SIEMPRE en Markdown estructurado tipo app:
- Usar tarjetas con encabezado emoji + título
- Tablas para ítems/listas
- Checklists para verificaciones
- Botones simulados: [Acción]
- KPIs con semáforos: 🔴 🟡 🟢
- NUNCA texto corrido largo sin estructura

VALIDACIONES AUTOMÁTICAS:
- IDs: OBR-001, PAR-YYYY-MM-DD-##, RFI-###, OC-###, CERT-YYYY-MM-OBR-###, NC-###, SH-###
- Fechas: YYYY-MM-DD
- OC total = Σ(cant × unit) + IVA 21%
- Certificación neta = Σ(items) + variaciones – retenciones
- KPIs: SPI = EV/PV, CPI = EV/AC → < 0.95 🔴 | 0.95–0.99 🟡 | ≥ 1.00 🟢

COMANDOS SLASH:
/nuevo_parte → formulario parte diario
/nuevo_RFI → formulario RFI
/nueva_orden_compra → formulario OC con tabla items
/nueva_certificacion → formulario certificación con cálculo neto
/nueva_incidencia_SH → formulario SHyMA
/nueva_NC → formulario no conformidad
/dashboard_obra {ID} → tablero completo de obra
/buscar {query} → tabla de resultados filtrados

PLANTILLAS:

Parte Diario:
🧾 Parte Diario — {OBRA} — {fecha}
- Clima: {condición, temp °C}
- Personal: Total {n} | {oficios}
- Actividades: {frente} | {descripción} | {%avance}
- Materiales: {listado}
- Incidencias: {detalle}
[Guardar parte] [Agregar foto] [Generar PDF]

RFI:
❓ RFI-{ID} — {OBRA}
- Disciplina: {Arquitectura/Estructura/MEP}
- Consulta: {texto}
- Impacto: {días} días | $\{monto\}
- Estado: 🟡 Abierto
[Enviar] [Añadir comentario] [Vincular a cambio] [Cerrar]

Orden de Compra:
📦 OC-{n} — {Proveedor}
| Ítem | UM | Cant | $Unit | $Total |
Subtotal / IVA 21% / Total
Estado: 🟡 En aprobación
[Enviar a aprobación] [Adjuntar cotización]

Certificación:
📈 Certificación — {OBRA} — Periodo {AAAAMM}
| WBS | Descripción | UM | Cant | Precio | Monto |
Neto a certificar = Σ + variaciones − retenciones
[Exportar PDF] [Enviar a cliente]

Dashboard:
🏗️ Dashboard — {OBRA}
- Avance físico: {%} | Curva S: {status}
- RFIs abiertos: {n} | OCs pendientes: {n}
- Certificación en curso: $\{monto\}
- Incidencias SHyMA: {n} 🔴/{n} 🟡
- NC Calidad: {n} abiertas

COMPORTAMIENTO:
- Si faltan datos → devolver mini-formulario en tarjeta
- Recordar dentro de la sesión los registros creados
- Si el usuario escribe "agregar 500 kg φ8 a $1.10" → parsear y añadir como ítem OC
- Fuera del dominio construcción/licitaciones → redirigir amablemente
- Siempre proponer siguiente acción con botones [Acción]`;

const QUICK_CMDS = [
  { label: "📋 Parte diario", cmd: "/nuevo_parte" },
  { label: "❓ RFI", cmd: "/nuevo_RFI" },
  { label: "📦 Orden de compra", cmd: "/nueva_orden_compra" },
  { label: "📈 Certificación", cmd: "/nueva_certificacion" },
  { label: "🦺 SH", cmd: "/nueva_incidencia_SH" },
  { label: "✅ No conformidad", cmd: "/nueva_NC" },
  { label: "🏗️ Dashboard", cmd: "/dashboard_obra OBR-001" },
];

function MarkdownRenderer({ text }) {
  const renderInline = (t) => {
    const parts = t.split(/(\*\*.*?\*\*|`.*?`)/);
    return parts.map((p, i) => {
      if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} style={{ color: "#fff", fontWeight: 700 }}>{p.slice(2, -2)}</strong>;
      if (p.startsWith("`") && p.endsWith("`")) return <code key={i} style={{ background: "#ffffff15", padding: "1px 5px", borderRadius: "3px", fontSize: "0.78rem", color: "#1A9B7B" }}>{p.slice(1, -1)}</code>;
      return p;
    });
  };
  const renderLine = (line, i) => {
    if (line.startsWith("### ")) return <h3 key={i} style={{ color: "#1A9B7B", fontSize: "0.85rem", fontWeight: 700, margin: "10px 0 4px", letterSpacing: "0.05em", textTransform: "uppercase" }}>{line.slice(4)}</h3>;
    if (line.startsWith("## ")) return <h2 key={i} style={{ color: "#1A9B7B", fontSize: "1rem", fontWeight: 700, margin: "14px 0 6px", borderBottom: "1px solid #1A9B7B40", paddingBottom: "4px" }}>{line.slice(3)}</h2>;
    if (line.startsWith("# ")) return <h1 key={i} style={{ color: "#1A9B7B", fontSize: "1.1rem", fontWeight: 800, margin: "16px 0 8px" }}>{line.slice(2)}</h1>;
    if (line.startsWith("|")) {
      const cells = line.split("|").filter(c => c.trim() !== "");
      if (cells.every(c => /^[-:\s]+$/.test(c))) return null;
      return <tr key={i}>{cells.map((c, j) => <td key={j} style={{ padding: "4px 10px", borderBottom: "1px solid #ffffff10", fontSize: "0.8rem", color: "#ddd", whiteSpace: "nowrap" }}>{renderInline(c.trim())}</td>)}</tr>;
    }
    if (line.startsWith("- [ ]") || line.startsWith("- [x]")) {
      const checked = line.startsWith("- [x]");
      return <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", margin: "2px 0", fontSize: "0.82rem", color: "#ccc" }}><span style={{ color: checked ? "#22c55e" : "#666" }}>{checked ? "✅" : "⬜"}</span>{line.slice(6)}</div>;
    }
    if (line.startsWith("- ")) return <div key={i} style={{ display: "flex", gap: "8px", margin: "2px 0", fontSize: "0.82rem", color: "#ccc" }}><span style={{ color: "#1A9B7B", marginTop: "1px" }}>▸</span><span>{renderInline(line.slice(2))}</span></div>;
    if (/\[.*?\]/.test(line) && !line.startsWith("|")) {
      const parts = line.split(/(\[.*?\])/);
      return <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: "6px", margin: "8px 0" }}>{parts.map((p, j) => p.startsWith("[") && p.endsWith("]") ? <span key={j} style={{ background: "#1A9B7B20", border: "1px solid #1A9B7B60", color: "#1A9B7B", padding: "3px 10px", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}>{p.slice(1, -1)}</span> : p ? <span key={j} style={{ fontSize: "0.82rem", color: "#aaa" }}>{p}</span> : null)}</div>;
    }
    if (line.trim() === "") return <div key={i} style={{ height: "6px" }} />;
    return <div key={i} style={{ fontSize: "0.82rem", color: "#ccc", margin: "2px 0", lineHeight: "1.5" }}>{renderInline(line)}</div>;
  };
  const lines = text.split("\n");
  const elements = [];
  let tableRows = [];
  lines.forEach((line, i) => {
    if (line.startsWith("|")) {
      const el = renderLine(line, i);
      if (el) tableRows.push(el);
    } else {
      if (tableRows.length > 0) {
        elements.push(<div key={`t${i}`} style={{ overflowX: "auto", margin: "8px 0" }}><table style={{ borderCollapse: "collapse", width: "100%" }}><tbody>{tableRows}</tbody></table></div>);
        tableRows = [];
      }
      elements.push(renderLine(line, i));
    }
  });
  if (tableRows.length > 0) elements.push(<div key="tend" style={{ overflowX: "auto", margin: "8px 0" }}><table style={{ borderCollapse: "collapse", width: "100%" }}><tbody>{tableRows}</tbody></table></div>);
  return <div>{elements}</div>;
}

function ChatModule({ initCmd }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function sendMessage(text) {
    const msg = ((text || input) || "").trim();
    if (!msg) return;
    setInput("");
    const newMessages = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const res = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, system: SYSTEM_PROMPT }),
      });
      const data = await res.json();
      const reply = data.content?.map(c => c.text || "").join("") || data.reply || "Error en la respuesta.";
      setMessages(m => [...m, { role: "assistant", content: reply }]);
    } catch (e) { setMessages(m => [...m, { role: "assistant", content: "⚠️ Error de conexión." }]); }
    setLoading(false);
  }

  useEffect(() => { if (initCmd) { setTimeout(() => sendMessage(initCmd), 100); } }, []);
  const TEAL = "#1A9B7B";
  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0f1210" }}>
      {/* Quick commands */}
      <div style={{ padding: "10px 14px", display: "flex", gap: "6px", flexWrap: "wrap", borderBottom: "1px solid #1e2a2215", background: "#141a16" }}>
        {QUICK_CMDS.map(q => (
          <button key={q.cmd} onClick={() => sendMessage(q.cmd)} disabled={loading}
            style={{ background: "#1e2a22", border: `1px solid #1A9B7B30`, color: "#8ab8a8", padding: "4px 10px", borderRadius: "4px", fontSize: "0.72rem", cursor: "pointer", fontFamily: "inherit" }}
            onMouseEnter={e => { e.target.style.borderColor = TEAL; e.target.style.color = TEAL; }}
            onMouseLeave={e => { e.target.style.borderColor = "#1A9B7B30"; e.target.style.color = "#8ab8a8"; }}>
            {q.label}
          </button>
        ))}
      </div>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", marginTop: "60px", opacity: 0.5 }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>🤖</div>
            <div style={{ fontSize: "0.9rem", color: "#8ab8a8" }}>Agente Choix listo</div>
            <div style={{ fontSize: "0.75rem", color: "#4a6055", marginTop: "6px" }}>Usá los comandos rápidos o escribí lo que necesitás</div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: "12px" }}>
            {msg.role === "assistant" && (
              <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: TEAL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", flexShrink: 0, marginRight: "8px", marginTop: "2px" }}>C</div>
            )}
            <div style={{ maxWidth: "85%", background: msg.role === "user" ? "#1A9B7B18" : "#141a16", border: `1px solid ${msg.role === "user" ? "#1A9B7B40" : "#1e2a22"}`, borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px", padding: "10px 14px" }}>
              {msg.role === "user" ? <div style={{ fontSize: "0.82rem", color: "#d8e4de" }}>{msg.content}</div> : <MarkdownRenderer text={msg.content} />}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: TEAL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>C</div>
            <div style={{ background: "#141a16", border: "1px solid #1e2a22", borderRadius: "12px 12px 12px 2px", padding: "10px 16px", display: "flex", gap: "5px" }}>
              {[0,1,2].map(j => <div key={j} style={{ width: "6px", height: "6px", borderRadius: "50%", background: TEAL, animation: "bounce 1s infinite", animationDelay: `${j*0.2}s` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {/* Input */}
      <div style={{ padding: "12px 14px", borderTop: "1px solid #1e2a22", background: "#141a16", display: "flex", gap: "8px", alignItems: "flex-end" }}>
        <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder="Escribí un comando o consulta... (Enter para enviar)" rows={1}
          style={{ flex: 1, background: "#1e2a22", border: "1px solid #2a3a30", borderRadius: "8px", padding: "10px 14px", color: "#d8e4de", fontSize: "0.82rem", fontFamily: "inherit", resize: "none", outline: "none", lineHeight: "1.5", maxHeight: "120px", overflowY: "auto" }}
          onFocus={e => e.target.style.borderColor = TEAL}
          onBlur={e => e.target.style.borderColor = "#2a3a30"} />
        <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
          style={{ background: loading || !input.trim() ? "#1e2a22" : TEAL, border: "none", borderRadius: "8px", padding: "10px 16px", color: loading || !input.trim() ? "#4a6055" : "#fff", fontWeight: 700, fontSize: "0.8rem", cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
          {loading ? "..." : "ENVIAR ▶"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHELL PRINCIPAL — NAVEGACIÓN INTEGRADA
// ═══════════════════════════════════════════════════════════════════════════════

// Wrapper for Precios standalone in shell
function PresupuestosModulePrecios() {
  // handled below
  const [pa, setPa] = useState({});
  const [ready, setReady] = useState(false);
  useEffect(() => {
    (async () => {
      try { const r = await storage.get("choix_precios"); if (r?.value) setPa(JSON.parse(r.value)); } catch {}
      setReady(true);
    })();
  }, []);
  useEffect(() => {
    if (!ready) return;
    (async () => { try { await storage.set("choix_precios", JSON.stringify(pa)); } catch {} })();
  }, [pa, ready]);
  if (!ready) return <div style={{padding:"40px", textAlign:"center", color:"#4a6055"}}>Cargando...</div>;
  return <div style={{height:"100%", overflow:"auto", padding:"16px", background:COLORS.bg}}><GestorPrecios preciosActualizados={pa} setPreciosActualizados={setPa} /></div>;
}


// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function DashboardModule() {
  const [proyectos, setProyectos] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get("choix_proyectos");
        if (r?.value) setProyectos(JSON.parse(r.value));
      } catch {}
    })();
  }, []);

  const obras = proyectos.filter(p => p.activo !== false);
  const totalPresupuestado = obras.reduce((sum, p) => {
    const items = p.items || [];
    return sum + items.reduce((s, it) => s + ((it.precioCustom ?? it.precioBase ?? 0) * (it.cantPresup ?? 0)) * (1 + (p.icc || 0) / 100), 0);
  }, 0);

  const alertasRojas = obras.flatMap(p => (p.items || []).filter(it => {
    const consumido = it.consumidoReal ?? 0;
    const presup = it.cantPresup ?? 0;
    return presup > 0 && consumido / presup > 0.9;
  }).map(it => ({ ...it, obra: p.nombre })));

  const top5obras = [...obras].sort((a, b) => {
    const tot = p => (p.items||[]).reduce((s,it) => s + ((it.precioCustom??it.precioBase??0)*(it.cantPresup??0))*(1+(p.icc||0)/100), 0);
    return tot(b) - tot(a);
  }).slice(0, 5);

  const TEAL = "#1A9B7B"; const GOLD = "#c8a84b"; const ROJO = "#e05a5a";
  const card = { background:"#141a16", border:"1px solid #1e2a22", borderRadius:"10px", padding:"16px", marginBottom:"12px" };

  return (
    <div style={{ padding:"20px", overflowY:"auto", height:"100%", background:"#0f1210" }}>
      <div style={{ fontWeight:800, fontSize:"18px", color:"#d8e4de", marginBottom:"16px" }}>📊 Dashboard General</div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"12px", marginBottom:"16px" }}>
        {[
          { label:"Obras activas", value: obras.length, color: TEAL },
          { label:"Monto total presup.", value: new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(totalPresupuestado), color: GOLD },
          { label:"Alertas semáforo 🔴", value: alertasRojas.length, color: ROJO },
        ].map(k => (
          <div key={k.label} style={card}>
            <div style={{ fontSize:"11px", color:"#4a6055", marginBottom:"6px" }}>{k.label}</div>
            <div style={{ fontSize:"22px", fontWeight:800, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Top 5 obras */}
      <div style={card}>
        <div style={{ fontWeight:700, color:GOLD, fontSize:"12px", marginBottom:"10px" }}>🏆 Top 5 obras por presupuesto</div>
        {top5obras.length === 0 ? <div style={{ color:"#4a6055", fontSize:"12px" }}>Sin datos</div> :
          top5obras.map((p,i) => {
            const tot = (p.items||[]).reduce((s,it) => s + ((it.precioCustom??it.precioBase??0)*(it.cantPresup??0))*(1+(p.icc||0)/100), 0);
            return (
              <div key={p.id} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #1e2a22", fontSize:"12px" }}>
                <span style={{ color:"#d8e4de" }}>#{i+1} {p.nombre}</span>
                <span style={{ color:GOLD, fontWeight:700 }}>{new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(tot)}</span>
              </div>
            );
          })
        }
      </div>

      {/* Top 5 items alerta roja */}
      <div style={card}>
        <div style={{ fontWeight:700, color:ROJO, fontSize:"12px", marginBottom:"10px" }}>🔴 Top 5 ítems con alerta roja</div>
        {alertasRojas.length === 0 ? <div style={{ color:"#4a6055", fontSize:"12px" }}>Sin alertas 🎉</div> :
          alertasRojas.slice(0,5).map((it,i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #1e2a22", fontSize:"12px" }}>
              <span style={{ color:"#d8e4de" }}>{it.desc}</span>
              <span style={{ color:ROJO, fontWeight:700 }}>{it.obra}</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { id: "dashboard",   icon: "📊", label: "Dashboard",       sub: "Resumen general" },
  { id: "chat",        icon: "🤖", label: "Agente IA",      sub: "Asistente" },
  { id: "presupuesto", icon: "📋", label: "Presupuestos",   sub: "Obras + precios" },
  { id: "parte",       icon: "🧾", label: "Parte Diario",   sub: "Registro diario" },
  { id: "rfi",         icon: "❓", label: "RFIs",           sub: "Consultas técnicas" },
  { id: "oc",          icon: "📦", label: "Órd. Compra",    sub: "Proveedores" },
  { id: "cert",        icon: "📈", label: "Certificaciones",sub: "Avance económico" },
  { id: "sh",          icon: "🦺", label: "SHyMA",          sub: "Seguridad e higiene" },
  { id: "calidad",     icon: "✅", label: "Calidad",        sub: "No conformidades" },
  { id: "precios",     icon: "💲", label: "Base Precios",   sub: "948 ítems + historial" },
];

// Modules that use chat IA (direct to ChatModule with pre-sent command)
const CHAT_MODULES = { parte: "/nuevo_parte", rfi: "/nuevo_RFI", oc: "/nueva_orden_compra", cert: "/nueva_certificacion", sh: "/nueva_incidencia_SH", calidad: "/nueva_NC" };

export default function ChoixIntegrado() {
  const [activeModule, setActiveModule] = useState("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatInitCmd, setChatInitCmd] = useState(null);

  const TEAL = "#1A9B7B";
  const BG = "#0f1210";
  const CARD = "#141a16";
  const BORDER = "#1e2a22";
  const TEXT = "#d8e4de";
  const MUTED = "#4a6055";

  function navigate(id) {
    if (CHAT_MODULES[id]) {
      setChatInitCmd(CHAT_MODULES[id]);
      setActiveModule("chat");
    } else {
      setChatInitCmd(null);
      setActiveModule(id);
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: BG, fontFamily: "'Inter','Segoe UI',Arial,sans-serif", color: TEXT, overflow: "hidden" }}>

      {/* ── SIDEBAR ── */}
      <div style={{ width: sidebarOpen ? "200px" : "56px", minWidth: sidebarOpen ? "200px" : "56px", background: CARD, borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", transition: "width 0.2s", overflow: "hidden" }}>

        {/* Logo */}
        <div style={{ padding: sidebarOpen ? "16px 14px 12px" : "16px 10px 12px", borderBottom: `1px solid ${BORDER}`, cursor: "pointer" }} onClick={() => setSidebarOpen(o => !o)}>
          {sidebarOpen ? (
            <div>
              <div style={{ fontSize: "8px", color: MUTED, letterSpacing: "0.25em", marginBottom: "2px" }}>CONSTRUCTORA</div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontFamily: "'Arial Black',Impact,sans-serif", fontWeight: 900, fontSize: "20px", color: TEXT, letterSpacing: "-0.02em" }}>CHOI</span>
                <svg width="16" height="20" viewBox="0 0 16 20" style={{ marginBottom: "1px" }}>
                  <line x1="1" y1="1" x2="15" y2="19" stroke={TEAL} strokeWidth="3.2" strokeLinecap="round"/>
                  <line x1="15" y1="1" x2="1" y2="19" stroke={TEXT} strokeWidth="3.2" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={{ height: "2px", background: TEAL, borderRadius: "1px", marginTop: "2px", width: "60px" }} />
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <svg width="22" height="26" viewBox="0 0 22 26" style={{ display: "block", margin: "0 auto" }}>
                <line x1="2" y1="2" x2="20" y2="24" stroke={TEAL} strokeWidth="3.5" strokeLinecap="round"/>
                <line x1="20" y1="2" x2="2" y2="24" stroke={TEXT} strokeWidth="3.5" strokeLinecap="round"/>
              </svg>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
          {NAV_ITEMS.map(item => {
            const isActive = activeModule === item.id || (CHAT_MODULES[item.id] && activeModule === "chat" && chatInitCmd === CHAT_MODULES[item.id]);
            return (
              <div key={item.id} onClick={() => navigate(item.id)}
                style={{ display: "flex", alignItems: "center", gap: "10px", padding: sidebarOpen ? "9px 14px" : "10px 0", justifyContent: sidebarOpen ? "flex-start" : "center", cursor: "pointer", background: isActive ? `${TEAL}18` : "transparent", borderLeft: isActive ? `3px solid ${TEAL}` : "3px solid transparent", transition: "all 0.15s" }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#1e2a22"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                <span style={{ fontSize: "16px", flexShrink: 0 }}>{item.icon}</span>
                {sidebarOpen && (
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: isActive ? TEAL : TEXT, lineHeight: 1.2 }}>{item.label}</div>
                    <div style={{ fontSize: "10px", color: MUTED, marginTop: "1px" }}>{item.sub}</div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div style={{ padding: "12px 14px", borderTop: `1px solid ${BORDER}`, fontSize: "10px", color: MUTED }}>
            <div>+60 años de trayectoria</div>
            <div style={{ color: TEAL, marginTop: "2px" }}>choixconstructora.com.ar</div>
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top header */}
        <div style={{ background: CARD, borderBottom: `2px solid ${TEAL}`, padding: "10px 20px", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px", color: TEXT }}>
              {NAV_ITEMS.find(n => n.id === activeModule)?.icon} {NAV_ITEMS.find(n => n.id === activeModule)?.label}
            </div>
            <div style={{ fontSize: "11px", color: MUTED }}>{NAV_ITEMS.find(n => n.id === activeModule)?.sub}</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e" }} />
            <span style={{ fontSize: "11px", color: "#22c55e" }}>EN LÍNEA</span>
          </div>
        </div>

        {/* Module content */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {activeModule === "dashboard" && <DashboardModule />}
          {activeModule === "chat" && <ChatModule key={chatInitCmd} initCmd={chatInitCmd} />}
          {activeModule === "presupuesto" && <PresupuestosModule />}
          {activeModule === "precios" && <PresupuestosModulePrecios />}
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0);opacity:0.4} 50%{transform:translateY(-4px);opacity:1} }
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#0f1210}
        ::-webkit-scrollbar-thumb{background:#1e2a22;border-radius:2px}
      `}</style>
    </div>
  );
}

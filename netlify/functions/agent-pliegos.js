exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { textoPDF, icc = 0 } = JSON.parse(event.body);
    // Limitar a primeras 15000 chars para evitar timeout
    const textoLimitado = textoPDF.slice(0, 8000);
    const apiKey = process.env.ANTHROPIC_API_KEY;

    const system = `Sos un experto en presupuestación de obra pública argentina, 
especializado en pliegos de la Dirección de Infraestructura Escolar de la 
Provincia de Buenos Aires.

Tu tarea es extraer todos los ítems de un cómputo y presupuesto oficial provincial.

El documento tiene esta estructura:
- RUBRO (número entero): encabezado de grupo, ej: "1 TRABAJOS PREPARATORIOS"
- Sub-rubro (número x.y): subdivisión, ej: "3.1 ESTRUCTURA H°A°"  
- Ítem: número de ítem + descripción + unidad + cantidad + precio unitario

Devolvé ÚNICAMENTE un JSON válido con esta estructura, sin texto adicional:
{
  "items": [
    {
      "rubroId": "1",
      "rubroNombre": "TRABAJOS PREPARATORIOS",
      "codigo": "1.2",
      "descripcion": "Cartel de obra",
      "unidad": "m2",
      "cantidad": 12.00,
      "precioUnitario": 107414.92
    }
  ]
}

Reglas:
- Incluí TODOS los ítems que tengan cantidad y precio unitario
- El codigo debe ser siempre "rubro.item" ej: "1.2", "3.5", "11.4"
- Los números están en formato argentino: puntos para miles, coma para decimales
- Ignorá las filas de totales de rubro, porcentajes y honorarios
- Si un ítem tiene número suelto (ej: "5 Demolición...") dentro del rubro 1, 
  su codigo es "1.5"`;

    const userMessage = `Extraé todos los ítems de este cómputo y presupuesto provincial:\n\n${textoLimitado}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        system,
        messages: [{ role: "user", content: userMessage }]
      })
    });

    const data = await response.json();
    const texto = data.content?.[0]?.text || "";
    
    // Limpiar y parsear JSON
    const jsonMatch = texto.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { 
        statusCode: 200, 
        body: JSON.stringify({ error: "No se pudo extraer JSON", raw: texto }) 
      };
    }
    
    const resultado = JSON.parse(jsonMatch[0]);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resultado)
    };

  } catch (error) {
    console.error("Error en agent-pliegos:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error en el agente de pliegos" })
    };
  }
};


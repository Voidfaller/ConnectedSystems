# Protocol Connected Systems eindopdracht | TI  
## Versie 1.4 
**Datum:** 13/04/25  
**Auteur(s):** Gabriela Arvelo, Mees Bogaards, Marit Snijder, Giovanni de Groot  

---

## 1. Inleiding  
Dit document beschrijft de communicatie tussen de centrale server en alle clients in het Connected Systems-project. Het protocol definieert hoe berichten worden opgebouwd, verstuurd en geïnterpreteerd, zodat een consistente en betrouwbare gegevensuitwisseling plaatsvindt.  

## 2. Communicatiemethode  
Het protocol maakt gebruik van **MQTT** voor de communicatie tussen de server en de robots. Alle berichten worden verzonden in **JSON-formaat** voor leesbaarheid en overzichtelijkheid.  

## 3. Berichtenstructuur  
Elk bericht wordt verzonden in een json

```json
{
      "x": 4,
      "y": 1,
      "direction": "north"
}
```



---

## 4. Berichttypen & MQTT Topics  

### **4.1 Aanmelding (registration)**  
**Verstuurd door:** Robots  
**Doel:** Een robot meldt zich aan bij de server 

**Topic:** `robots/registration` 
**Payload:**  
```json
  {
   "robot_id" : "robotID",
   "start_pos": {"x":2, "y":1, "direction": "north"},
   "robot_taskload": ["taskload"]
  }

```



---

### **4.2 Positie-update (position_update)**  
**Verstuurd door:** Robots  
**Doel:** De robot deelt zijn huidige positie en richting met de server.  

**Topic:** `robots/position/<robotID>`  
**Payload:**  
```json
   {
      "x": 6,
      "y": 4,
      "direction": "south"
   }

```

---

### **4.3 Obstakel gedetecteerd (obstacle_detected)**  
**Verstuurd door:** Robots  
**Doel:** De robot meldt een gevonden obstakel aan de server.  

#### 1. Robot meldt een gevonden obstakel aan de server
**Topic:** `robots/obstacle/<robotID>`
**Payload:**  
```json
{
      "x": 6,
      "y": 8,
      "obstacle_type": "wall"
}
```

---

 
### **4.4 Path Update**  
**Verstuurd door:** Server  
**Doel:** De server stuurt de kortst beschikbare route naar de robot.  

**Topic:** `robots/pathUpdate/<robotID>`  
**Payload:**  
```json
{
      "path": [
         "1,1", "2,1", "2,2"
      ]
}
```
---


### **4.5 start en stop**  
**Verstuurd door:** Dashboard / Fysieke unit  
**Doel:** Hiermee wordt het systeem gestart en gestopt

**Topic:** `server/powerControl`
**Payload:**
```json
{
   "state": 0
}
```
---
### **4.6 plan taak**
**Verstuurd door:** Dashboard
**Doel:** Hiermee wordt een taak gestuurd naar de simulatie

**Topic:** `Server/task/target`
**Payload:**
```json
{
   "x": 2,
   "y": 4,
   "taskType":"Heavy",
   "robotId":"robot_2"
}
```

> **Note:** De `robot_id` parameter is optioneel.  
> Als deze niet gespecificeerd is, zal de server automatisch de taak uitdelen aan een robot. Stuur in dit geval een lege string mee

-----
### **4.7 update taak**
**Verstuurd door:** Server
**Doel:** Hiermee wordt een taak geupdate in het dashboard

**Topic:** `Server/task/dashboard`
**Payload:**
```json
{
   "x":5,
   "y":2,
   "taskType":"Medium",
   "robotId":"robot_6"
}
```
## 5. Conclusie  
Dit protocol zorgt ervoor dat de communicatie tussen de server en de robots gestructureerd, betrouwbaar en efficiënt verloopt via MQTT. Door het gebruik van specifieke topics en gestandaardiseerde berichten kunnen robots en de server effectief met elkaar communiceren zonder dat er verwarring of conflicten ontstaan.  

---


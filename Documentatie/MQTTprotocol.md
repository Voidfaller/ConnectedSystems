# Protocol Connected Systems eindopdracht | TI  
## Versie 1.3  
**Datum:** 25/03/25  
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

#### **1. Robot vraagt om aanmelding** 
**Topic:** `robots/registration` 
**Payload:**  
```json
  {
   "robot_id" : "robotID"
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
      "y": -2,
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
      "y": -2,
      "obstacle_type": "wall"
}
```
---

### **4.4 Taaktoewijzing (task_assignment)**  
**Verstuurd door:** Server  
**Doel:** De server geeft een command aan de robot.  

**Topic:** `robots/robotID/task`  
**Payload:**  
```json
{
      "action": "move",
}
```

---

### **4.5 Statusupdate (status_update)**  
**Verstuurd door:** Robots  
**Doel:** De robot stuurt zijn huidige status naar de server.  

**Topic:** `robots/status/robot_12`  
**Payload:**  
```json
{
      "task": "idle"
}
```

---

### **4.6 Bevestiging (acknowledgment)**  
**Verstuurd door:** Robots / Server  
**Doel:** Bevestiging dat een bericht is ontvangen.  

**Topic:** `robots/acknowledgments`  
**Payload:**  
```json
{
   "sender": "robot_45",
   "type": "acknowledgment",
   "timestamp": 1707052860,
   "data": {
      "received_message_id": "12323466"
   }
}
```
---
### **4.7 Synchronisatie verzoek (sync_request)**  
**Verstuurd door:** Robots
**Doel:** Een robot vraagt alle bekende informatie op.


#### **1. Robot vraagt synchronisatie aan**
**Topic:** `robots/updates/sync/robot_12`
**Payload:** 
```json
{
   "sender": "robot_45",
   "type": "sync_request",
   "timestamp": 1707052860,
   "data": {
      "last_sync_timestamp": 17070528603
   }
}
```

#### **2. Server stuurt sync bericht**
**Topic:** `robots/updates/sync/robot_12`
**Payload:**
```json
{
   "sender": "server",
   "type": "",
   "timestamp": 129478124,
   "data":{
      "task"
      "obstacles":[{"x": 6, "y": -2, "object_type":"wall"}, {"x": 12, "y": 4, "object_type":"box"}] 
   }
}
```

---

### **4.8 start en stop**  
**Verstuurd door:** Dashboard / Fysieke unit  
**Doel:** Hiermee wordt het systeem gestart en gestopt

**Topic:** `system/powerControl`
**Payload:**
```json
{
   "state": 0
}
```
---

### **4.9 Foutafhandeling (error)**  
**Verstuurd door:** Robots / Server  
**Doel:** Een bericht is niet correct verwerkt of begrepen.  

**Topic:** `robots/errors`  
**Payload:**  
```json
{
   "sender": "robot_12",
   "type": "error",
   "timestamp": 1279841495,
   "data": {
      "error_code": 400,
      "error_message": "Bad Request"
   }
}
```

-----
## 5 Mogelijke foutcodes
| Error Code | Betekenis                                               |
| ---------- | ------------------------------------------------------- |
| **400**    | Bad Request - Ongeldig berichtformaat                   |
| **401**    | Unauthorized - Robot niet geautoriseerd                 |
| **403**    | Forbidden - Toegang geweigerd                           |
| **404**    | Not Found - Gevraagde resource niet gevonden            |
| **408**    | Timeout - Geen respons ontvangen                        |
| **500**    | Internal Server Error - Serverfout                      |
| **503**    | Service Unavailable - Server tijdelijk niet beschikbaar |
---

## 6. Conclusie  
Dit protocol zorgt ervoor dat de communicatie tussen de server en de robots gestructureerd, betrouwbaar en efficiënt verloopt via MQTT. Door het gebruik van specifieke topics en gestandaardiseerde berichten kunnen robots en de server effectief met elkaar communiceren zonder dat er verwarring of conflicten ontstaan.  

---


# Protocol Connected Systems eindopdracht | TI  
## Versie 1.2  
**Datum:** 04/03/25  
**Auteur(s):** Gabriela Arvelo, Mees Bogaards, Marit Snijder, Giovanni de Groot  

---

## 1. Inleiding  
Dit document beschrijft de communicatie tussen de centrale server en alle clients in het Connected Systems-project. Het protocol definieert hoe berichten worden opgebouwd, verstuurd en geïnterpreteerd, zodat een consistente en betrouwbare gegevensuitwisseling plaatsvindt.  

## 2. Communicatiemethode  
Het protocol maakt gebruik van **MQTT** voor de communicatie tussen de server en de robots. Alle berichten worden verzonden in **JSON-formaat** voor leesbaarheid en overzichtelijkheid.  

## 3. Berichtenstructuur  
Elk bericht bevat de volgende velden:  

```json
{
   "sender": "robot_1",
   "type": "position_update",
   "timestamp": 219719381,
   "data": {
      "x": 4,
      "y": 1,
      "direction": "north"
   }
}
```

### **Velden:**  
- **sender** (String): De naam of ID van de afzender.  
- **type** (String): Het type bericht, bijvoorbeeld:  
  - `registration_request`: Robot vraagt om een ID.  
  - `position_update`: Robot stuurt zijn huidige positie.  
  - `obstacle_detected`: Robot detecteert een obstakel.  
  - `task_assignment`: Server wijst een taak toe aan een robot.  
  - `status_update`: Robot stuurt zijn huidige status.  
  - `acknowledgment`: Bevestiging van ontvangst.  
  - `error`: Foutmelding bij verwerking.  
- **timestamp** (Integer): Unix-timestamp van het moment van verzending.  
- **data** (Object): Bevat specifieke informatie afhankelijk van het berichttype.  

---

## 4. Berichttypen & MQTT Topics  

### **4.1 Aanmelding (registration)**  
**Verstuurd door:** Robots  
**Doel:** Een robot meldt zich aan bij de server en ontvangt een uniek ID.  

#### **1. Robot vraagt om registratie** 
**Topic:** `robots/registration/request`  
**Payload:**  
```json
{
   "sender": "unknown",
   "type": "registration_request",
   "timestamp": 1707053100,
   "data": {
      "response_topic": "robots/response/robot_temp_1234"
   }
}
```

#### **2. Server kent een ID toe**  
**Topic:** `robots/response/robot_temp_1234`
**Payload:**
```json
{
   "sender": "server",
   "type": "registration_response",
   "timestamp": 1707053105,
   "data": {
      "assigned_robot_id": "robot_12",
   }
}
```

---

### **4.2 Positie-update (position_update)**  
**Verstuurd door:** Robots  
**Doel:** De robot deelt zijn huidige positie en richting met de server.  

**Topic:** `robots/updates/position`  
**Payload:**  
```json
{
   "sender": "robot_1",
   "type": "position_update",
   "timestamp": 1707052810,
   "data": {
      "x": 6,
      "y": -2,
      "direction": "south"
   }
}
```

---

### **4.3 Obstakel gedetecteerd (obstacle_detected)**  
**Verstuurd door:** Robots  
**Doel:** De robot meldt een gevonden obstakel aan de server.  

#### 1. Robot meldt een gevonden obstakel aan de server
**Topic:** `robots/updates/obstacles`  
**Payload:**  
```json
{
   "sender": "robot_1",
   "type": "obstacle_detected",
   "timestamp": 1707052814,
   "data": {
      "x": 6,
      "y": -2,
      "obstacle_type": "wall"
   }
}
```

#### 2. De server deelt de gevonden obstakel aan alle robots
**Topic:** `robots/world/obstacles`
**Payload:**
```json
{
   "sender": "server",
   "type": "obstacle_update",
   "timestamp": 1707052820,
   "data": {
      "x": 6,
      "y": -2,
      "obstacle_type": "wall",
      "reported_by": "robot_1"
   }
}
```

---

### **4.4 Taaktoewijzing (task_assignment)**  
**Verstuurd door:** Server  
**Doel:** De server wijst een taak toe aan een specifieke robot.  

**Topic:** `robots/commands/robot_12`  
**Payload:**  
```json
{
   "sender": "server",
   "type": "task_assignment",
   "timestamp": 1707055100,
   "data": {
      "task_id": "task_45",
      "action": "move",
      "target": {"x": 10, "y": 5}
   }
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
   "sender": "robot_12",
   "type": "status_update",
   "timestamp": 1707055000,
   "data": {
      "battery": 85,
      "task": "idle"
   }
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

### **4.8 Foutafhandeling (error)**  
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


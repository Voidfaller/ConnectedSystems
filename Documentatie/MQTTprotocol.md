Protocol Connected Systems eindopdracht | TI 
===================
Versie 1.0
Datum: 04/03/25
Auteur(s): Gabriela Arvelo, Mees Bogaards, Marit Snijder, Giovanni de Groot

## Inleiding
Dit document beschrijft de communicatie tussen de centrale server en alle clients in het Connected Systems-project. Het protocol definieert hoe berichten worden opgebouwd,verstuurd en geïnterpreteerd, zodat een consistente en betrouwbare gegevensuitwisseling plaatsvind.

## Communicatiemethode
Het protocol maakt gebruik van MQTT voor de communicatie tussen de server en zijn clients. Alle berichten worden verzonden in JSON format voor leesbaarheid en overzichtelijkheid

## Berichten structuur

```json
{
   "sender": "robot_1",
   "type": "position_update",
   "timestamp": 219719381,
   "data":{
    "x": 4,
    "y": 1,
    "direction": "north"
   }
}
```
### Velden:
- **sender** : (String) De naam of ID van de afzender.
- **type** : (String) Het type bericht, bijvoorbeeld:
  - **position_update** : De robot stuurt zijn huidige positie.
  - **obstacle_detected** : Een obstakel is gedetecteerd. 
  - **acknowledgment** : Een bevestiging dat een bericht is ontvangen
- **Timestamp** : (Integer) Unix-timestamp van het moment van verzending.
- **Data** : (Object) Bevat specifieke informatie afhankelijk van het berichttype.


### Berichttypen
Hieronder volgt een overzicht van de gedefineerde  berichttypen
## 1. Positie-update (position_update)
   **Verstuurd door:** Robots
   **Doel:** De robot deelt zijn huidige positie en richting met de server en andere robots.
   **Voorbeeld:** 
```json
{
   "sender": "robot_1",
   "type" : "position_update",
   "timestamp" : 1707052810,
   "data" : {
      "x": 6,
      "y" : -2,
      "direction" : "south"
   }
}
```

## 2. Obstakel gedetecteerd (obstacle_detected)
**Verstuurd door:** Robots
**Doel:**


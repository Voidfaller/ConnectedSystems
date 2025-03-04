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


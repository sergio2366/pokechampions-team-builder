// Datos de regulaciones de Pokémon Champions.
// Lista parcial de M-C: faltan los Pokémon a partir de #0858. Completar antes de dar por buena.
window.REGULATIONS = {
  current: 'M-C',
  list: [
    {
      id: 'M-C',
      name: 'Regulación M-C',
      start: '2026-09-09',
      end: '2026-12-02',
      complete: false,
      note: 'Lista incompleta: faltan Pokémon a partir de Hatterene (#0858).',
      sources: [
        'https://serebii.net/pokemonchampions/rankedbattle/regulationm-c.shtml',
        'https://www.serebii.net/pokemonchampions/recruit/regularrosterm-c.shtml',
      ],
      // Nombres base. Las formas regionales y variantes se aceptan si su especie base está aquí.
      pokemon: [
        'Venusaur', 'Charizard', 'Blastoise', 'Beedrill', 'Pidgeot', 'Arbok', 'Pikachu', 'Raichu',
        'Clefable', 'Ninetales', 'Wigglytuff', 'Vileplume', 'Persian', 'Arcanine', 'Alakazam', 'Machamp',
        'Victreebel', 'Slowbro', "Farfetch'd", 'Gengar', 'Kangaskhan', 'Starmie', 'Mr. Mime', 'Pinsir',
        'Tauros', 'Gyarados', 'Ditto', 'Vaporeon', 'Jolteon', 'Flareon', 'Aerodactyl', 'Snorlax',
        'Dragonite', 'Meganium', 'Typhlosion', 'Feraligatr', 'Ariados', 'Ampharos', 'Azumarill', 'Politoed',
        'Espeon', 'Umbreon', 'Slowking', 'Forretress', 'Steelix', 'Qwilfish', 'Scizor', 'Heracross',
        'Skarmory', 'Houndoom', 'Tyranitar', 'Sceptile', 'Blaziken', 'Swampert', 'Pelipper', 'Gardevoir',
        'Sableye', 'Mawile', 'Aggron', 'Medicham', 'Manectric', 'Swalot', 'Sharpedo', 'Camerupt', 'Torkoal',
        'Altaria', 'Milotic', 'Castform', 'Banette', 'Chimecho', 'Absol', 'Glalie', 'Salamence', 'Metagross',
        'Torterra', 'Infernape', 'Empoleon', 'Staraptor', 'Luxray', 'Roserade', 'Rampardos', 'Bastiodon',
        'Lopunny', 'Spiritomb', 'Garchomp', 'Lucario', 'Hippowdon', 'Toxicroak', 'Abomasnow', 'Weavile',
        'Rhyperior', 'Leafeon', 'Glaceon', 'Gliscor', 'Mamoswine', 'Gallade', 'Froslass', 'Rotom',
        'Serperior', 'Emboar', 'Samurott', 'Watchog', 'Liepard', 'Simisage', 'Simisear', 'Simipour',
        'Musharna', 'Excadrill', 'Audino', 'Conkeldurr', 'Scolipede', 'Whimsicott', 'Krookodile', 'Scrafty',
        'Cofagrigus', 'Garbodor', 'Zoroark', 'Reuniclus', 'Vanilluxe', 'Emolga', 'Eelektross', 'Chandelure',
        'Beartic', 'Stunfisk', 'Golurk', 'Hydreigon', 'Volcarona', 'Chesnaught', 'Delphox', 'Greninja',
        'Diggersby', 'Talonflame', 'Vivillon', 'Pyroar', 'Florges', 'Gogoat', 'Pangoro', 'Furfrou',
        'Meowstic', 'Aegislash', 'Aromatisse', 'Slurpuff', 'Malamar', 'Barbaracle', 'Dragalge', 'Clawitzer',
        'Heliolisk', 'Tyrantrum', 'Aurorus', 'Sylveon', 'Hawlucha', 'Dedenne', 'Goodra', 'Klefki',
        'Trevenant', 'Gourgeist', 'Avalugg', 'Noivern', 'Decidueye', 'Incineroar', 'Primarina', 'Toucannon',
        'Crabominable', 'Lycanroc', 'Toxapex', 'Mudsdale', 'Araquanid', 'Salazzle', 'Tsareena', 'Oranguru',
        'Passimian', 'Golisopod', 'Mimikyu', 'Drampa', 'Kommo-o', 'Rillaboom', 'Cinderace', 'Inteleon',
        'Corviknight', 'Thievul', 'Flapple', 'Appletun', 'Sandaconda', 'Toxtricity', 'Grapploct',
        'Polteageist', 'Hatterene',
        // Añadidos en M-C según la página de Pokémon recién habilitados de Serebii.
        'Perrserker', "Sirfetch'd", 'Pincurchin', 'Indeedee', 'Pawmot', 'Arboliva', 'Squawkabilly',
        'Mabosstiff', 'Baxcalibur',
      ],
      // null = todos los objetos disponibles en la PokeAPI (la lista de objetos de M-C no está completa).
      items: null,
      // Objetos nuevos en M-C según Serebii (referencia).
      newItems: [
        'Leek', 'Rocky Helmet', 'Air Balloon', 'Red Card', 'Binding Band', 'Eject Button', 'Normal Gem',
        'Terrain Extender', 'Electric Seed', 'Psychic Seed', 'Misty Seed', 'Grassy Seed',
      ],
    },
  ],
};

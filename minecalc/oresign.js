// Data for ores in the Rock Reader app
const ores = [
    // Non-ore standard signatures retained from previous version
    { name: "Debris", signature: 2000 },
    { name: "Ground Vehicle Deposits", signature: 3000 },
    { name: "FPS Mineables", signature: 4000 },

    // Legendary
    { name: "Quantainium", rarity: "Legendary", secondary: "Beryl", signature: 3170, instability: 1000, resistance: 95, density: 2930, locationNote: "Stanton Only" },
    { name: "Stileron", rarity: "Legendary", secondary: "Taranite", signature: 3185, instability: 870, resistance: 60, density: 681, locationNote: "Pyro Only" },
    { name: "Savrilium", rarity: "Legendary", secondary: "Gold", signature: 3200, instability: 1000, resistance: 95, density: 2588, locationNote: "Nyx Only" },

    // Epic
    { name: "Riccite", rarity: "Epic", secondary: "Laranite", signature: 3385, instability: 850, resistance: 95, density: 229, locationNote: "Pyro Only" },
    { name: "Ouratite", rarity: "Epic", secondary: "Agricium", signature: 3370, instability: 600, resistance: 60, density: 158 },
    { name: "Lindinium", rarity: "Epic", secondary: "Tungsten", signature: 3400, instability: 1000, resistance: 95, density: 340, locationNote: "Nyx Only" },

    // Rare
    { name: "Taranite", rarity: "Rare", signature: 3555, instability: 700, resistance: 50, density: 1462 },
    { name: "Gold", rarity: "Rare", secondary: "Borase", tertiary: "Bexalite", signature: 3585, instability: 550, resistance: 50, density: 2768 },
    { name: "Borase", rarity: "Rare", secondary: "Bexalite", tertiary: "Gold", signature: 3570, instability: 40, resistance: 30, density: 645 },
    { name: "Beryl", rarity: "Rare", signature: 3540, instability: 350, resistance: 65, density: 394 },
    { name: "Bexalite", rarity: "Rare", secondary: "Borase", tertiary: "Gold", signature: 3600, instability: 600, resistance: 60, density: 989 },

    // Uncommon
    { name: "Tungsten", rarity: "Uncommon", secondary: "Laranite", signature: 3870, instability: 0, resistance: -40, density: 2766 },
    { name: "Torite", rarity: "Uncommon", signature: 3900, instability: 550, resistance: 25, density: 401 },
    { name: "Titanium", rarity: "Uncommon", secondary: "Agricium", tertiary: "Aslarite", signature: 3855, instability: 0, resistance: 10, density: 645 },
    { name: "Laranite", rarity: "Uncommon", secondary: "Tungsten", signature: 3825, instability: 400, resistance: 50, density: 1648 },
    { name: "Aslarite", rarity: "Uncommon", secondary: "Agricium", tertiary: "Titanium", signature: 3840, instability: 700, resistance: 50, density: 329 },
    { name: "Agricium", rarity: "Uncommon", secondary: "Aslarite", tertiary: "Titanium", signature: 3885, instability: 350, resistance: 50, density: 1032 },

    // Common
    { name: "Aluminium", rarity: "Common", secondary: "Corundum", signature: 4285, instability: 0, resistance: -40, density: 387 },
    { name: "Copper", rarity: "Common", secondary: "Tin", signature: 4240, instability: 50, resistance: -70, density: 1284 },
    { name: "Corundum", rarity: "Common", secondary: "Aluminium", signature: 4225, instability: 50, resistance: 10, density: 576 },
    { name: "Hephestanite", rarity: "Common", secondary: "Quartz", tertiary: "Silicon", signature: 4180, instability: 550, resistance: 50, density: 459 },
    { name: "Ice", rarity: "Common", signature: 4300, instability: 0, resistance: -50, density: 143 },
    { name: "Iron", rarity: "Common", signature: 4270, instability: 50, resistance: -40, density: 1128 },
    { name: "Quartz", rarity: "Common", secondary: "Hephestanite", tertiary: "Silicon", signature: 4210, instability: 50, resistance: -70, density: 380 },
    { name: "Silicon", rarity: "Common", secondary: "Hephestanite", signature: 4255, instability: 50, resistance: -20, density: 335 },
    { name: "Tin", rarity: "Common", secondary: "Copper", signature: 4195, instability: 0, resistance: -20, density: 827 }
];
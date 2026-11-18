interface Country {
  names: readonly string[];
  cities: readonly string[];
}

export const countries: readonly Country[] = [
  { names: ["Pakistan"], cities: ["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad"] },
  {
    names: ["United Arab Emirates", "UAE"],
    cities: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman"],
  },
  { names: ["Saudi Arabia", "KSA"], cities: ["Riyadh", "Jeddah", "Dammam"] },
  {
    names: ["United Kingdom", "UK", "Great Britain"],
    cities: ["London", "Leeds", "Manchester", "Birmingham", "Bristol", "Edinburgh", "Glasgow"],
  },
  {
    names: ["United States", "USA", "US"],
    cities: ["New York", "Austin", "Chicago", "Hartford", "Phoenix"],
  },
  { names: ["Canada"], cities: ["Toronto", "Vancouver"] },
  { names: ["Netherlands"], cities: ["Rotterdam", "Amsterdam"] },
  { names: ["Germany"], cities: ["Berlin"] },
  { names: ["Portugal"], cities: ["Lisbon"] },
];

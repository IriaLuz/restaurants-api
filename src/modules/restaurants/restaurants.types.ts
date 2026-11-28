// The shape of our data inside the app. These are plain TypeScript types:
// they don't know about Express, HTTP or SQL.

export interface Restaurant {
  id: string;
  code: string; // e.g. "CAMDEN": short, unique, always uppercase
  name: string;
  city: string;
  isActive: boolean;
  createdAt: Date;
}

/** What we need to create a restaurant. The database fills in id and createdAt. */
export interface NewRestaurant {
  code: string;
  name: string;
  city: string;
  isActive: boolean;
}

/** The fields you're allowed to change after creating a restaurant. The code can't change. */
export type RestaurantChanges = Partial<
  Pick<Restaurant, "name" | "city" | "isActive">
>;

export interface RestaurantFilter {
  city?: string;
}

export interface OpeningHourSlot {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
}

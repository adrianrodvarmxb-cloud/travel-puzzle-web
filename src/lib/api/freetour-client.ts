import { TourAPI } from '@/types';
import { IzFTEventDetail } from './schemas/FTEvent.Schema';

interface FreeTourAuthResponse {
  data: {
    token: {
      accessToken: string;
      tokenType: string;
      expiresAt: string;
    };
    user: {
      email: string;
    };
  };
  status: number;
}

interface FreeTourToursResponse {
  data: {
    tours: TourAPI[];
    totalObjects: number;
    totalPages: number;
    currentPage: number;
  };
  status: number;
}

interface FreeTourTourResponse {
  data: TourAPI;
  status: number;
}

export interface FreeTourCountry {
  id: number;
  title: {
    en: string;
    es: string;
    pt: string;
    de: string;
    fr: string;
    it: string;
  };
  shortTitle: string;
  URLs: Record<string, string>;
  image: string;
  continent: Record<string, string>;
}

interface FreeTourCountriesResponse {
  data: FreeTourCountry[];
  status: number;
}

export interface FreeTourCity {
  id: number;
  title: {
    en: string;
    es: string;
    pt: string;
    de: string;
    fr: string;
    it: string;
  };
  URLs: Record<string, string>;
  image: string;
  coordinates: string;
}

interface FreeTourCitiesResponse {
  data: FreeTourCity[];
  status: number;
}

export interface TourEvent {
  id: number;
  tourId: number;
  language: string;
  date: string; // Format: "YYYY-MM-DD HH:mm:ss"
}

interface FreeTourEventsResponse {
  data: TourEvent[];
  status: number;
}

export interface FreeTourEventDetailResponse {
  data: IzFTEventDetail;
  status: number;
}

export class FreeTourClient {
  private baseURL = 'https://www.freetour.com/partnersAPI/v.2.0';
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private authenticating: Promise<void> | null = null;

  private validateEnvironmentVariables(): void {
    if (!process.env.FREETOUR_EMAIL || !process.env.FREETOUR_PASSWORD) {
      throw new Error(
        'FreeTour API credentials are not configured. Please set FREETOUR_EMAIL and FREETOUR_PASSWORD environment variables.'
      );
    }
  }

  async authenticate(): Promise<void> {
    this.validateEnvironmentVariables();

    console.log('[FreeTourClient] Authenticating...');
    const response = await fetch(`${this.baseURL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.FREETOUR_EMAIL!,
        password: process.env.FREETOUR_PASSWORD!,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[FreeTourClient] Auth error response:', errorText);
      throw new Error(`FreeTour auth failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: FreeTourAuthResponse = await response.json();
    this.accessToken = data.data.token.accessToken;
    this.tokenExpiresAt = new Date(data.data.token.expiresAt);

    // Add a 5-minute buffer before expiration to avoid edge cases
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    this.tokenExpiresAt = new Date(this.tokenExpiresAt.getTime() - bufferTime);

    console.log('[FreeTourClient] Authentication successful. Token expires at:', this.tokenExpiresAt);
  }

  async ensureAuthenticated(): Promise<void> {
    // If already authenticating, wait for that to complete
    if (this.authenticating) {
      await this.authenticating;
      return;
    }

    // Check if token is valid (with buffer time)
    const now = new Date();
    const needsAuth = !this.accessToken || !this.tokenExpiresAt || now >= this.tokenExpiresAt;

    if (needsAuth) {
      // Create a promise for the authentication process
      this.authenticating = this.authenticate().catch((error) => {
        // Reset token on auth failure
        this.accessToken = null;
        this.tokenExpiresAt = null;
        throw error;
      }).finally(() => {
        // Clear the authenticating promise when done
        this.authenticating = null;
      });

      await this.authenticating;
    }

    // Final safety check
    if (!this.accessToken) {
      throw new Error('FreeTour authentication failed: No access token available');
    }
  }

  async fetchTours(page: number = 1): Promise<FreeTourToursResponse> {
    await this.ensureAuthenticated();

    if (!this.accessToken) {
      throw new Error('FreeTour authentication failed: No access token available');
    }

    const response = await fetch(`${this.baseURL}/tours?page=${page}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`FreeTour tours fetch failed: ${response.statusText}`);
    }

    return response.json();
  }

  async fetchTourById(tourId: string | number): Promise<FreeTourTourResponse> {
    await this.ensureAuthenticated();

    if (!this.accessToken) {
      throw new Error('FreeTour authentication failed: No access token available');
    }

    const response = await fetch(`${this.baseURL}/tours/${tourId}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // If we get a 401, try to re-authenticate once
      if (response.status === 401) {
        console.log('[FreeTourClient] Received 401, re-authenticating...');
        this.accessToken = null;
        this.tokenExpiresAt = null;
        await this.ensureAuthenticated();

        if (!this.accessToken) {
          throw new Error('FreeTour authentication failed after retry: No access token available');
        }

        // Retry the request once
        const retryResponse = await fetch(`${this.baseURL}/tours/${tourId}`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!retryResponse.ok) {
          const error = new Error(`FreeTour tour fetch failed: ${retryResponse.statusText}`);
          (error as any).status = retryResponse.status;
          throw error;
        }

        return retryResponse.json();
      }

      const error = new Error(`FreeTour tour fetch failed: ${response.statusText}`);
      (error as any).status = response.status;
      throw error;
    }

    return response.json();
  }

  async fetchCountries(): Promise<FreeTourCountriesResponse> {
    await this.ensureAuthenticated();

    if (!this.accessToken) {
      throw new Error('FreeTour authentication failed: No access token available');
    }

    const response = await fetch(`${this.baseURL}/countries`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`FreeTour countries fetch failed: ${response.statusText}`);
    }

    return response.json();
  }

  async fetchCities(countryId: number): Promise<FreeTourCitiesResponse> {
    await this.ensureAuthenticated();

    if (!this.accessToken) {
      throw new Error('FreeTour authentication failed: No access token available');
    }

    const response = await fetch(`${this.baseURL}/cities/${countryId}?haveActive=1`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`FreeTour cities fetch failed: ${response.statusText}`);
    }

    return response.json();
  }

  async fetchEventsByTourId(tourId: string | number): Promise<FreeTourEventsResponse> {
    await this.ensureAuthenticated();

    if (!this.accessToken) {
      throw new Error('FreeTour authentication failed: No access token available');
    }

    const response = await fetch(`${this.baseURL}/tours/${tourId}/events`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // If we get a 401, try to re-authenticate once
      if (response.status === 401) {
        console.log('[FreeTourClient] Received 401, re-authenticating...');
        this.accessToken = null;
        this.tokenExpiresAt = null;
        await this.ensureAuthenticated();

        if (!this.accessToken) {
          throw new Error('FreeTour authentication failed after retry: No access token available');
        }

        // Retry the request once
        const retryResponse = await fetch(`${this.baseURL}/tours/${tourId}/events`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!retryResponse.ok) {
          const error = new Error(`FreeTour events fetch failed: ${retryResponse.statusText}`);
          (error as any).status = retryResponse.status;
          throw error;
        }

        return retryResponse.json();
      }

      const error = new Error(`FreeTour events fetch failed: ${response.statusText}`);
      (error as any).status = response.status;
      throw error;
    }

    return response.json();
  }

  async fetchEventDetailById(eventId: string | number): Promise<FreeTourEventDetailResponse> {
    await this.ensureAuthenticated();

    if (!this.accessToken) {
      throw new Error('FreeTour authentication failed: No access token available');
    }

    const response = await fetch(`${this.baseURL}/event/${eventId}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // If we get a 401, try to re-authenticate once
      if (response.status === 401) {
        console.log('[FreeTourClient] Received 401, re-authenticating...');
        this.accessToken = null;
        this.tokenExpiresAt = null;
        await this.ensureAuthenticated();

        if (!this.accessToken) {
          throw new Error('FreeTour authentication failed after retry: No access token available');
        }

        // Retry the request once
        const retryResponse = await fetch(`${this.baseURL}/event/${eventId}`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!retryResponse.ok) {
          const error = new Error(`FreeTour event detail fetch failed: ${retryResponse.statusText}`);
          (error as any).status = retryResponse.status;
          throw error;
        }

        const retryData = await retryResponse.json();
        return retryData;
      }

      const error = new Error(`FreeTour event detail fetch failed: ${response.statusText}`);
      (error as any).status = response.status;
      throw error;
    }

    const data = await response.json();
    return data;
  }

  async fetchAllTours(maxPages?: number): Promise<TourAPI[]> {
    const firstPage = await this.fetchTours(1);
    const { totalPages } = firstPage.data;
    let allTours = firstPage.data.tours;

    const pagesToFetch = maxPages ? Math.min(maxPages, totalPages) : totalPages;
    console.log(`Fetching ${pagesToFetch} pages of tours (total available: ${totalPages})...`);

    // Fetch remaining pages in batches of 5 concurrently
    const BATCH_SIZE = 5;
    const remainingPages = Array.from({ length: pagesToFetch - 1 }, (_, i) => i + 2);

    for (let i = 0; i < remainingPages.length; i += BATCH_SIZE) {
      const batch = remainingPages.slice(i, i + BATCH_SIZE);
      const batchStart = batch[0];
      const batchEnd = batch[batch.length - 1];

      console.log(`Fetching batch: pages ${batchStart}-${batchEnd} (${Math.ceil(remainingPages.length / BATCH_SIZE)} batches total)...`);

      // Fetch batch concurrently with Promise.all
      const batchResults = await Promise.all(
        batch.map(page => this.fetchTours(page))
      );

      // Collect tours from batch
      batchResults.forEach(response => {
        allTours = [...allTours, ...response.data.tours];
      });

      // Delay between batches to avoid overwhelming the API
      if (i + BATCH_SIZE < remainingPages.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`✅ Fetched ${allTours.length} tours successfully`);
    return allTours;
  }
}

export const freeTourClient = new FreeTourClient();


const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:5000"
).replace(/\/+$/, "");


/* ============================================================
   API ERROR
============================================================ */

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(
    message: string,
    status: number,
    data: unknown = null
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}


/* ============================================================
   API REQUEST
============================================================ */

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(
          "access_token"
        )
      : null;


  /* ==========================================================
     HEADERS
  ========================================================== */

  const headers = new Headers(
    options.headers
  );

  /*
   * FormData must NOT receive a manually-set
   * Content-Type header because the browser
   * automatically adds the multipart boundary.
   */
  if (
    !headers.has("Content-Type") &&
    !(options.body instanceof FormData)
  ) {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  if (
    !headers.has("Accept")
  ) {
    headers.set(
      "Accept",
      "application/json"
    );
  }

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`
    );
  }


  /* ==========================================================
     REQUEST URL
  ========================================================== */

  const cleanEndpoint =
    endpoint.startsWith("/")
      ? endpoint
      : `/${endpoint}`;

  const url =
    `${API_URL}${cleanEndpoint}`;


  /* ==========================================================
     FETCH
  ========================================================== */

  let response: Response;

  try {
    response = await fetch(
      url,
      {
        ...options,
        headers,
      }
    );
  } catch (error) {
    console.error(
      "API request failed:",
      error
    );

    throw new Error(
      "Unable to connect to the server. Please make sure the backend is running."
    );
  }


  /* ==========================================================
     RESPONSE PARSING
  ========================================================== */

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  let data: any = {};

  try {
    if (
      contentType.includes(
        "application/json"
      )
    ) {
      data =
        await response.json();
    } else {
      const text =
        await response.text();

      data = text
        ? {
            message: text,
          }
        : {};
    }
  } catch {
    data = {};
  }


  /* ==========================================================
     AUTHENTICATION FAILURE
  ========================================================== */

  if (
    response.status === 401
  ) {
    if (
      typeof window !==
      "undefined"
    ) {
      localStorage.removeItem(
        "access_token"
      );

      localStorage.removeItem(
        "refresh_token"
      );

      /*
       * Do not repeatedly redirect
       * when already on login.
       */
      if (
        window.location.pathname !==
        "/login"
      ) {
        window.location.href =
          "/login";
      }
    }

    throw new ApiError(
      data?.message ||
        "Your session has expired. Please sign in again.",
      401,
      data
    );
  }


  /* ==========================================================
     OTHER API ERRORS
  ========================================================== */

  if (!response.ok) {
    throw new ApiError(
      data?.message ||
        "Something went wrong. Please try again.",
      response.status,
      data
    );
  }


  /* ==========================================================
     SUCCESS
  ========================================================== */

  return data;
}
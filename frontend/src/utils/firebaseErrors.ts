/**
 * Converts standard Firebase Auth error codes into localized, user-friendly messages.
 */
export const getFriendlyErrorMessage = (errorCode: string, defaultMsg: string = "An error occurred. Please try again.") => {
  switch (errorCode) {
    // General & Network Errors
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection and try again.";
    case "auth/internal-error":
      return "An internal system error occurred. Please try again later.";
    case "auth/too-many-requests":
      return "Too many failed login attempts. This account has been temporarily locked. Please try again later.";

    // Login Specific Errors
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password. Please try again.";

    // Signup Specific Errors
    case "auth/email-already-in-use":
      return "This email address is already registered. Please sign in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password is too weak. It must be at least 6 characters.";
    case "auth/operation-not-allowed":
      return "Email and password registration is currently disabled. Please contact support.";

    default:
      return defaultMsg;
  }
};

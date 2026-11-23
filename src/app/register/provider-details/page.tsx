import PendingPage from "../../pending/page";

export const dynamic = "force-dynamic";

// The provider's private verification details are the third step of registration.
// Reuse the same guarded page and form so existing pending providers keep their workflow.
export default PendingPage;

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "privacy" | "terms" | "accessibility";
}

const PolicyModal = ({ open, onOpenChange, type }: PolicyModalProps) => {
  const getContent = () => {
    switch (type) {
      case "privacy":
        return {
          title: "🛡️ Privacy Policy",
          content: (
            <div className="space-y-6">
              <section>
                <h3 className="font-semibold text-lg mb-2">1. Introduction</h3>
                <p className="text-muted-foreground leading-relaxed">
                  The RCMRD Swimming Pool Management System values your privacy and is committed to protecting the personal information you share when using our services.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">2. Information We Collect</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">We collect data such as:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Full name, registration number, and contact details</li>
                  <li>Membership and access information</li>
                  <li>Check-in/check-out logs and equipment use</li>
                  <li>Payment information for visitor or membership services</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">3. How We Use the Data</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">Your data helps us:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Verify and manage access to the swimming pool</li>
                  <li>Maintain accurate records and safety logs</li>
                  <li>Process payments and generate reports</li>
                  <li>Communicate updates, maintenance schedules, and safety alerts</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">4. Data Protection</h3>
                <p className="text-muted-foreground leading-relaxed">
                  All personal data is securely stored and protected against unauthorized access. We use encryption, access controls, and periodic audits to maintain data integrity.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">5. Data Sharing</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We do not sell or share your personal data with third parties, except when required by law or for authorized system maintenance.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">6. Your Rights</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">You have the right to:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Access and update your information</li>
                  <li>Request data deletion or correction</li>
                  <li>Withdraw consent for certain uses</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">7. Contact</h3>
                <p className="text-muted-foreground leading-relaxed">For privacy-related inquiries:</p>
                <p className="text-muted-foreground mt-2">
                  📧 <a href="mailto:Swimmingpool@rcmrd.org" className="text-primary hover:underline">Swimmingpool@rcmrd.org</a>
                </p>
                <p className="text-muted-foreground">📞 0742 335 679</p>
              </section>
            </div>
          ),
        };

      case "terms":
        return {
          title: "📄 Terms of Service",
          content: (
            <div className="space-y-6">
              <section>
                <h3 className="font-semibold text-lg mb-2">1. Acceptance of Terms</h3>
                <p className="text-muted-foreground leading-relaxed">
                  By accessing or using the RCMRD Swimming Pool Management System, you agree to abide by these Terms of Service and applicable institutional regulations.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">2. User Responsibilities</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">Users must:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Provide accurate information during registration.</li>
                  <li>Follow RCMRD pool safety and conduct rules.</li>
                  <li>Avoid sharing login credentials or impersonating others.</li>
                  <li>Report any system errors or safety incidents promptly.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">3. Access and Membership</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Membership types (students, residents, members, visitors) define access privileges. Unauthorized access or misuse may result in suspension or revocation of privileges.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">4. Payments and Refunds</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Visitors and members agree to pay applicable fees. Refunds or cancellations follow RCMRD's financial policy.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">5. System Usage</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">You agree not to:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Tamper with data, bypass security, or disrupt service.</li>
                  <li>Upload false or malicious information.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">6. Limitation of Liability</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">RCMRD is not responsible for:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Downtime due to maintenance or technical failures.</li>
                  <li>Personal loss or injury arising from pool usage outside prescribed safety guidelines.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">7. Amendments</h3>
                <p className="text-muted-foreground leading-relaxed">
                  RCMRD reserves the right to update these terms. Continued use implies acceptance of any changes.
                </p>
              </section>
            </div>
          ),
        };

      case "accessibility":
        return {
          title: "♿ Accessibility Statement",
          content: (
            <div className="space-y-6">
              <section>
                <h3 className="font-semibold text-lg mb-2">1. Our Commitment</h3>
                <p className="text-muted-foreground leading-relaxed">
                  RCMRD is committed to ensuring digital accessibility for all users, including those with disabilities. We continuously improve usability and user experience for everyone.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">2. Accessibility Features</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">The Swimming Pool Management System includes:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Responsive design for all screen sizes</li>
                  <li>Readable text contrast and scalable fonts</li>
                  <li>Keyboard navigation compatibility</li>
                  <li>Descriptive labels for forms and inputs</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">3. Continuous Improvement</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We are actively testing the platform against accessibility standards (WCAG 2.1 Level AA) to identify and resolve any barriers.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">4. Feedback</h3>
                <p className="text-muted-foreground leading-relaxed">If you encounter any accessibility issues, please contact:</p>
                <p className="text-muted-foreground mt-2">
                  📧 <a href="mailto:Swimmingpool@rcmrd.org" className="text-primary hover:underline">Swimmingpool@rcmrd.org</a>
                </p>
                <p className="text-muted-foreground mb-2">📞 0742 335 679</p>
                <p className="text-muted-foreground leading-relaxed">
                  We aim to respond within 5 working days and take corrective actions promptly.
                </p>
              </section>
            </div>
          ),
        };
    }
  };

  const { title, content } = getContent();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {type === "privacy" && "Privacy Policy for RCMRD Swimming Pool Management System"}
            {type === "terms" && "Terms of Service for RCMRD Swimming Pool Management System"}
            {type === "accessibility" && "Accessibility Statement for RCMRD Swimming Pool Management System"}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[calc(85vh-8rem)] pr-4">
          {content}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default PolicyModal;

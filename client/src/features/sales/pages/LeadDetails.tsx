import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Phone, Mail, Building } from "lucide-react";

export default function LeadDetails() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link to="/sales" data-testid="link-back-to-sales">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Pipeline
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Lead Details
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Lead ID: {id}</p>
          </div>
        </div>
        
        <Button data-testid="button-edit-lead">
          <Edit className="w-4 h-4 mr-2" />
          Edit Lead
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Sample Lead Name</h3>
                  <p className="text-gray-600 dark:text-gray-400">Sample Organization</p>
                </div>
                <Badge variant="secondary">Qualified</Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>contact@example.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>(555) 123-4567</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-gray-400" />
                  <span>Technology</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Value:</span>
                  <span className="text-green-600 font-semibold">$25,000</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes & Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                No activity recorded yet. Add notes about your interactions with this lead.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['New', 'Qualified', 'Proposal', 'Negotiation', 'Closed'].map((stage, index) => (
                  <div key={stage} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${index <= 1 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                    <span className={`text-sm ${index <= 1 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500'}`}>
                      {stage}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline" data-testid="button-schedule-follow-up">
                Schedule Follow-up
              </Button>
              <Button className="w-full" variant="outline" data-testid="button-create-quote">
                Create Quote
              </Button>
              <Button className="w-full" variant="outline" data-testid="button-send-proposal">
                Send Proposal
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LeadStage } from "../types";

// Kanban columns for lead stages
const LEAD_COLUMNS = [
  { stage: LeadStage.NEW, title: "New Leads", color: "bg-blue-500" },
  { stage: LeadStage.QUALIFIED, title: "Qualified", color: "bg-yellow-500" },
  { stage: LeadStage.PROPOSAL, title: "Proposal", color: "bg-purple-500" },
  { stage: LeadStage.NEGOTIATION, title: "Negotiation", color: "bg-orange-500" },
  { stage: LeadStage.CLOSED_WON, title: "Closed Won", color: "bg-green-500" },
  { stage: LeadStage.CLOSED_LOST, title: "Closed Lost", color: "bg-red-500" },
];

export default function LeadsBoard() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Sales Pipeline
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and manage your sales leads through the pipeline
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" data-testid="button-filter">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button data-testid="button-add-lead">
            <Plus className="w-4 h-4 mr-2" />
            New Lead
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search leads by name, company, or contact..."
            className="pl-10"
            data-testid="input-search-leads"
          />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {LEAD_COLUMNS.map((column) => (
          <Card key={column.stage} className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm">
                <span>{column.title}</span>
                <Badge variant="secondary" className="text-xs">0</Badge>
              </CardTitle>
              <div className={`h-1 w-full rounded ${column.color}`} />
            </CardHeader>
            
            <CardContent className="space-y-3 min-h-[400px]">
              {/* Placeholder for leads */}
              <div className="text-center text-gray-500 dark:text-gray-400 text-sm pt-8">
                No leads in this stage
              </div>
              
              {/* Drop zone indicator */}
              <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center text-gray-400 opacity-0 hover:opacity-100 transition-opacity">
                Drop leads here
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">0</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">$0</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Pipeline Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">0%</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Close Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">0</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Avg Days to Close</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
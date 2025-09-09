import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Shield, 
  Copy,
  Check,
  Loader2
} from 'lucide-react';

interface PermissionTemplate {
  id: string;
  name: string;
  description?: string;
  template_type: 'system' | 'custom' | 'role-based';
  permissions: Record<string, boolean>;
  page_access: Record<string, boolean>;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface AvailablePermissions {
  actions: Record<string, Record<string, string>>;
  pages: Record<string, Record<string, string>>;
  roleDefaults: Record<string, any>;
}

export default function PermissionTemplatesManagement() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<PermissionTemplate[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<AvailablePermissions | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PermissionTemplate | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    templateType: 'custom' as 'system' | 'custom' | 'role-based',
    permissions: {} as Record<string, boolean>,
    pageAccess: {} as Record<string, boolean>
  });

  useEffect(() => {
    loadTemplates();
    loadAvailablePermissions();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const result = await api.get('/api/v1/permission-templates');
      if (result.success) {
        setTemplates(result.data.templates || []);
      } else {
        toast({
          title: "Error",
          description: result.error?.message || "Failed to load permission templates",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load permission templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailablePermissions = async () => {
    try {
      const result = await api.get('/api/v1/permission-templates/available-permissions');
      if (result.success) {
        setAvailablePermissions(result.data);
      }
    } catch (error) {
      console.error('Failed to load available permissions:', error);
    }
  };

  const createTemplate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const result = await api.post('/api/v1/permission-templates', {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        templateType: formData.templateType,
        permissions: formData.permissions,
        pageAccess: formData.pageAccess
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Permission template created successfully",
        });
        setShowCreateModal(false);
        resetForm();
        loadTemplates();
      } else {
        toast({
          title: "Error",
          description: result.error?.message || "Failed to create template",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const updateTemplate = async () => {
    if (!selectedTemplate) return;

    setEditing(selectedTemplate.id);
    try {
      const result = await api.put(`/api/v1/permission-templates/${selectedTemplate.id}`, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        templateType: formData.templateType,
        permissions: formData.permissions,
        pageAccess: formData.pageAccess
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Permission template updated successfully",
        });
        setShowEditModal(false);
        resetForm();
        loadTemplates();
      } else {
        toast({
          title: "Error",
          description: result.error?.message || "Failed to update template",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update template",
        variant: "destructive",
      });
    } finally {
      setEditing(null);
    }
  };

  const deleteTemplate = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the template "${name}"?`)) return;

    try {
      const result = await api.delete(`/api/v1/permission-templates/${id}`);
      if (result.success) {
        toast({
          title: "Success",
          description: "Permission template deleted successfully",
        });
        loadTemplates();
      } else {
        toast({
          title: "Error",
          description: result.error?.message || "Failed to delete template",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const duplicateTemplate = async (template: PermissionTemplate) => {
    const newTemplate = {
      name: `${template.name} (Copy)`,
      description: template.description,
      templateType: template.template_type,
      permissions: template.permissions,
      pageAccess: template.page_access
    };

    setCreating(true);
    try {
      const result = await api.post('/api/v1/permission-templates', newTemplate);
      if (result.success) {
        toast({
          title: "Success",
          description: "Template duplicated successfully",
        });
        loadTemplates();
      } else {
        toast({
          title: "Error",
          description: result.error?.message || "Failed to duplicate template",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate template",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (template: PermissionTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      templateType: template.template_type,
      permissions: template.permissions || {},
      pageAccess: template.page_access || {}
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      templateType: 'custom',
      permissions: {},
      pageAccess: {}
    });
    setSelectedTemplate(null);
  };

  const handlePermissionToggle = (permissionKey: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permissionKey]: checked
      }
    }));
  };

  const handlePageAccessToggle = (pageKey: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      pageAccess: {
        ...prev.pageAccess,
        [pageKey]: checked
      }
    }));
  };

  const getTemplateTypeColor = (type: string) => {
    switch (type) {
      case 'system': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'role-based': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'custom': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const renderPermissionSelector = () => {
    if (!availablePermissions) return null;

    return (
      <div className="space-y-6">
        {/* Action Permissions */}
        <div>
          <h4 className="text-lg font-medium text-white mb-4">Action Permissions</h4>
          <div className="space-y-4">
            {Object.entries(availablePermissions.actions).map(([category, actions]) => (
              <div key={category} className="p-4 rounded-lg bg-white/5 border border-white/10">
                <h5 className="font-medium text-white mb-3 capitalize">{category.toLowerCase()}</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(actions).map(([action, permissionKey]) => (
                    <div key={permissionKey} className="flex items-center space-x-2">
                      <Checkbox
                        id={permissionKey}
                        checked={formData.permissions[permissionKey] || false}
                        onCheckedChange={(checked) => handlePermissionToggle(permissionKey, checked as boolean)}
                      />
                      <Label htmlFor={permissionKey} className="text-white/80 text-sm">
                        {action.replace(/_/g, ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Page Access */}
        <div>
          <h4 className="text-lg font-medium text-white mb-4">Page Access</h4>
          <div className="space-y-4">
            {Object.entries(availablePermissions.pages).map(([category, pages]) => (
              <div key={category} className="p-4 rounded-lg bg-white/5 border border-white/10">
                <h5 className="font-medium text-white mb-3 capitalize">{category.toLowerCase()}</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(pages).map(([page, pageKey]) => (
                    <div key={pageKey} className="flex items-center space-x-2">
                      <Checkbox
                        id={pageKey}
                        checked={formData.pageAccess[pageKey] || false}
                        onCheckedChange={(checked) => handlePageAccessToggle(pageKey, checked as boolean)}
                      />
                      <Label htmlFor={pageKey} className="text-white/80 text-sm">
                        {page.replace(/_/g, ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-white">Permission Templates</h3>
          <p className="text-white/60 text-sm">Create reusable permission sets for easy user management</p>
        </div>
        
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
              onClick={resetForm}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Permission Template</DialogTitle>
              <DialogDescription className="text-gray-400">
                Create a new reusable permission template
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Enter template name..."
                  />
                </div>
                <div>
                  <Label htmlFor="templateType">Template Type</Label>
                  <Select
                    value={formData.templateType}
                    onValueChange={(value: any) => setFormData({...formData, templateType: value})}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="custom">Custom</SelectItem>
                      <SelectItem value="role-based">Role-based</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Optional description..."
                />
              </div>

              {/* Permission Selection */}
              {renderPermissionSelector()}
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={createTemplate}
                disabled={creating || !formData.name.trim()}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
              >
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates Table */}
      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto" />
          <p className="mt-2 text-white/60">Loading templates...</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-white/5">
                <TableHead className="text-white/70">Name</TableHead>
                <TableHead className="text-white/70">Type</TableHead>
                <TableHead className="text-white/70">Description</TableHead>
                <TableHead className="text-white/70">Permissions</TableHead>
                <TableHead className="text-white/70">Created</TableHead>
                <TableHead className="text-white/70">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-white/60">
                    No permission templates found. Create your first template to get started.
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium text-white">{template.name}</TableCell>
                    <TableCell>
                      <Badge className={getTemplateTypeColor(template.template_type)}>
                        {template.template_type.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white/70 max-w-xs truncate">
                      {template.description || 'No description'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="border-white/20 text-white/70 text-xs">
                          {Object.keys(template.permissions || {}).length} actions
                        </Badge>
                        <Badge variant="outline" className="border-white/20 text-white/70 text-xs">
                          {Object.keys(template.page_access || {}).length} pages
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-white/70">
                      {new Date(template.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => duplicateTemplate(template)}
                          className="border-white/20 text-white/70 hover:bg-white/10"
                          title="Duplicate template"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(template)}
                          className="border-white/20 text-white/70 hover:bg-white/10"
                          disabled={editing === template.id}
                        >
                          {editing === template.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Edit className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteTemplate(template.id, template.name)}
                          className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Permission Template</DialogTitle>
            <DialogDescription className="text-gray-400">
              Modify the selected permission template
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Template Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="edit-templateType">Template Type</Label>
                <Select
                  value={formData.templateType}
                  onValueChange={(value: any) => setFormData({...formData, templateType: value})}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="role-based">Role-based</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            {/* Permission Selection */}
            {renderPermissionSelector()}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditModal(false)}
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={updateTemplate}
              disabled={editing !== null || !formData.name.trim()}
              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
            >
              {editing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Update Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { updateProfile } from "firebase/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/card";
import { Settings as SettingsIcon, Save } from "lucide-react";

export function Settings() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [startBalance, setStartBalance] = useState(() => localStorage.getItem("startBalance") || "1000");
  const [journalName, setJournalName] = useState(() => localStorage.getItem("journalName") || "Arbitrary Trading");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage({ text: "", type: "" });
    try {
      if (user) {
        await updateProfile(user, {
          displayName: displayName,
        });
      }
      
      localStorage.setItem("startBalance", startBalance);
      localStorage.setItem("journalName", journalName);
      
      // Dispatch custom event for journalName update across components
      window.dispatchEvent(new Event("journalNameUpdate"));
      window.dispatchEvent(new Event("startBalanceUpdate"));

      setMessage({ text: "Settings saved successfully", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to save settings", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-mono tracking-tight text-white flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-primary shrink-0" />
          <span>Settings</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your personal details and app configuration.
        </p>
      </header>

      <Card className="bg-card/50 border-input">
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>Update your display name and preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email || ""} disabled className="bg-muted text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input 
              id="displayName" 
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)} 
              placeholder="e.g. John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="journalName">Journal Title</Label>
            <Input 
              id="journalName" 
              value={journalName} 
              onChange={(e) => setJournalName(e.target.value)} 
              placeholder="e.g. My Trading Journal"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startBalance">Starting Equity / Balance</Label>
            <Input 
              id="startBalance" 
              type="number"
              value={startBalance} 
              onChange={(e) => setStartBalance(e.target.value)} 
              placeholder="1000"
            />
            <p className="text-xs text-muted-foreground">This value is used to calculate your current equity.</p>
          </div>

          {message.text && (
            <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
              {message.text}
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-4 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
             <Save className="w-4 h-4" />
             {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

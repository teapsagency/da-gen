import React from "react";
import { useDAStore } from "@/store/daStore";
import { Upload, Trash2 } from "lucide-react";

export const AgencyLogoUpload = () => {
  const { agencyLogo, setAgencyLogo } = useDAStore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAgencyLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col gap-2 pt-1">
      <span className="text-xs font-medium text-foreground/40">
        Logo de votre agence
      </span>
      <div className="flex items-center gap-2">
        <label className="flex-1 flex flex-col items-center justify-center h-[72px] border border-dashed border-border rounded-xl hover:border-foreground/20 hover:bg-foreground/[0.02] transition-all cursor-pointer group">
          {agencyLogo ? (
            <img
              src={agencyLogo}
              alt="Agency Logo"
              className="max-h-10 object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <Upload className="w-4 h-4 text-foreground/15 group-hover:text-foreground/30 transition-colors" />
              <span className="text-[11px] text-foreground/25 font-medium group-hover:text-foreground/40 transition-colors">
                Importer
              </span>
            </div>
          )}
          <input
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept="image/*"
          />
        </label>
        {agencyLogo && (
          <button
            onClick={() => setAgencyLogo("")}
            className="h-[72px] w-10 rounded-xl border border-border text-foreground/15 hover:text-red-500 hover:border-red-500/20 hover:bg-red-500/5 transition-all bg-background flex items-center justify-center cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

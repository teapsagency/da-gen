import React from "react";
import { useDAStore } from "@/store/daStore";
import { Upload, Check, Trash2 } from "lucide-react";

const DEFAULT_LOGO = "/logo-teaps.svg";

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

  const isDefault = agencyLogo === DEFAULT_LOGO;
  const isCustom = agencyLogo && !isDefault;

  return (
    <div className="flex flex-col gap-2 pt-1">
      <span className="text-xs font-medium text-foreground/40">
        Logo de votre agence
      </span>
      <div className="flex flex-wrap gap-2">
        {/* Default logo tile */}
        <button
          onClick={() => setAgencyLogo(DEFAULT_LOGO)}
          className={`w-14 h-14 rounded-xl border-2 p-2 transition-all duration-200 flex items-center justify-center bg-foreground relative group cursor-pointer ${
            isDefault
              ? "border-foreground ring-1 ring-foreground/10"
              : "border-transparent opacity-40 hover:opacity-100"
          }`}
        >
          <img
            src={DEFAULT_LOGO}
            alt="Teaps"
            className="max-w-full max-h-full object-contain"
          />
          {isDefault && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-foreground flex items-center justify-center z-10">
              <Check className="w-2.5 h-2.5 text-background" />
            </div>
          )}
        </button>

        {/* Custom uploaded logo tile */}
        {isCustom && (
          <div className="relative group">
            <button
              onClick={() => {}}
              className="w-14 h-14 rounded-xl border-2 border-foreground ring-1 ring-foreground/10 p-2 transition-all duration-200 flex items-center justify-center bg-white cursor-default"
            >
              <img
                src={agencyLogo}
                alt="Custom logo"
                className="max-w-full max-h-full object-contain"
              />
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-foreground flex items-center justify-center z-10">
                <Check className="w-2.5 h-2.5 text-background" />
              </div>
            </button>
            <button
              onClick={() => setAgencyLogo(DEFAULT_LOGO)}
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border border-border text-foreground/30 hover:text-red-500 hover:border-red-500/30 transition-all flex items-center justify-center cursor-pointer z-10"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          </div>
        )}

        {/* Upload tile — same size as logo tiles */}
        <label
          className={`w-14 h-14 rounded-xl border-2 border-dashed border-border hover:border-foreground/20 hover:bg-foreground/[0.02] transition-all cursor-pointer flex items-center justify-center group ${
            isCustom ? "opacity-40 hover:opacity-100" : ""
          }`}
        >
          <Upload className="w-4 h-4 text-foreground/15 group-hover:text-foreground/30 transition-colors" />
          <input
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept="image/*"
          />
        </label>
      </div>
    </div>
  );
};

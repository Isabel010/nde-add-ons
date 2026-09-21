import { Component, Input, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'orca-external-search',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orca-external-search.component.html',
  styleUrl: './orca-external-search.component.scss',
})
export class OrcaExternalSearchComponent implements OnInit {

  // Injected by the Primo NDE host — gives this component access to the parent slot's context
  @Input() hostComponent!: any;

  // NUEVO: controla si el menú desplegable está abierto o cerrado
  public isOpen = false;

  toggleMenu(): void {
    this.isOpen = !this.isOpen;
  }

  // Merged result of defaults and institution-supplied MODULE_PARAMETERS config
  public params: any;

  // worldcatString should be a full URL prefix including scheme, e.g.
  // "https://uwashington.on.worldcat.org/search?databaseList=&queryString="
  // The search terms are appended directly, so the prefix must end with the query parameter
  public worldcatString: string;
  public worldcatBrandName: string;    // Display name shown in the link text, e.g. "UW WorldCat"
  public worldcatLogoUrl: string;      // URL of the WorldCat logo image
  public googleScholarLogoUrl: string; // URL of the Google Scholar logo image
  public facetName: string;            // Título de la faceta, equivalente a "facetName" en Primo VE

  // NUEVO: buscadores adicionales del custom.js de Primo VE de la UPO.
  // Cada uno se configura con su prefijo de URL (...String) y su logo (...LogoUrl).
  public baseString: string;
  public baseLogoUrl: string;
  public lensString: string;
  public lensLogoUrl: string;
  public isidoreString: string;
  public isidoreLogoUrl: string;
  public pubmedString: string;
  public pubmedLogoUrl: string;
  public scopusString: string;
  public scopusLogoUrl: string;

  constructor(
    // MODULE_PARAMETERS is provided by the Primo NDE host with the JSON config supplied by the institution.
    // Defaults below are used when a parameter is absent from the config.
    @Inject('MODULE_PARAMETERS') public moduleParameters: any
  ) {
    this.params = Object.assign({
      worldcatString: "https://search.worldcat.org/search?q=",
      worldcatBrandName: "WorldCat",
      worldcatLogoUrl: "https://search.worldcat.org/favicons/favicon-32x32.png",
      googleScholarLogoUrl: "https://scholar.google.com/favicon.ico",
      facetName: "External Searches",
      baseString: "https://www.base-search.net/Search/Results?lookfor=",
      baseLogoUrl: "",
      lensString: "https://www.lens.org/lens/search/scholar/list?q=",
      lensLogoUrl: "",
      isidoreString: "https://isidore.science/s?q=",
      isidoreLogoUrl: "",
      pubmedString: "https://pubmed.ncbi.nlm.nih.gov/?term=",
      pubmedLogoUrl: "",
      scopusString: "https://www.scopus.com/results/results.uri?sort=plf-f&src=s&st1=",
      scopusLogoUrl: ""
    }, moduleParameters);

    this.worldcatString = this.params.worldcatString;
    this.worldcatBrandName = this.params.worldcatBrandName;
    this.worldcatLogoUrl = this.params.worldcatLogoUrl;
    this.googleScholarLogoUrl = this.params.googleScholarLogoUrl;
    this.facetName = this.params.facetName;

    this.baseString = this.params.baseString;
    this.baseLogoUrl = this.params.baseLogoUrl;
    this.lensString = this.params.lensString;
    this.lensLogoUrl = this.params.lensLogoUrl;
    this.isidoreString = this.params.isidoreString;
    this.isidoreLogoUrl = this.params.isidoreLogoUrl;
    this.pubmedString = this.params.pubmedString;
    this.pubmedLogoUrl = this.params.pubmedLogoUrl;
    this.scopusString = this.params.scopusString;
    this.scopusLogoUrl = this.params.scopusLogoUrl;
  }

  // Initialized to null/empty; computed in ngOnInit once the URL is accessible
  searchMode: string | null = null;
  searchQuery: string | null = null;
  searchTerms: string = '';       // términos planos, sin prefijo de campo — usados por la mayoría de buscadores
  worldcatSearchUrl: string = '';

  // NUEVO: URLs finales de los buscadores adicionales
  baseSearchUrl: string = '';
  lensSearchUrl: string = '';
  isidoreSearchUrl: string = '';
  pubmedSearchUrl: string = '';
  scopusSearchUrl: string = '';

  ngOnInit() {
    // Read the current search mode and query from the Primo page URL.
    // These are computed here (not in field initializers) to ensure the DOM
    // and DI context are fully established before window.location is accessed.
    this.searchMode = this.getUrlParameter('mode');
    this.searchQuery = this.getUrlParameter('query');

    // processText extracts the human-readable search terms from the raw query string,
    // handling both simple and advanced search modes.
    // Réplica exacta del mapping() de WorldCat/Google Scholar/Base/Lens/Isidore/PubMed en el
    // custom.js de Primo VE de la UPO: todos ellos solo extraían el término (sin prefijo de
    // campo tipo ti:/au:), así que comparten esta misma cadena.
    this.searchTerms = encodeURIComponent(this.processText(this.searchQuery ?? ''));
    this.worldcatSearchUrl = this.worldcatString + this.searchTerms;

    // Base, Lens, Isidore y PubMed usan el mismo mapping simple que WorldCat/Google Scholar
    this.baseSearchUrl = this.baseString + this.searchTerms;
    this.lensSearchUrl = this.lensString + this.searchTerms;
    this.isidoreSearchUrl = this.isidoreString + this.searchTerms;
    this.pubmedSearchUrl = this.pubmedString + this.searchTerms;

    // Scopus es distinto: además del término, añade parámetros de sesión/filtro propios
    // y repite el término dentro de "TITLE-ABS-KEY(...)", replicando el mapping original.
    // Nota: "sid=72b42d04c56bed76c4a7b17c904e3dde" es el valor que ya usabais en Primo VE.
    // Si algún día notáis que Scopus deja de funcionar bien, revisad si ese "sid" sigue siendo válido.
    this.scopusSearchUrl = this.scopusString + this.searchTerms
      + "&sid=72b42d04c56bed76c4a7b17c904e3dde&sot=b&sdt=b&sl=26&s=TITLE-ABS-KEY%28" + this.searchTerms + "%29";
  }

  // Reads a single query parameter from the current page URL.
  getUrlParameter(parameterName: string): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(parameterName);
  }

  // Extracts a clean, human-readable search string from the Primo query parameter.
  // (Sin cambios respecto al original — sigue usándose para Google Scholar)
  processText(input: string): string {
    if (this.searchMode === 'advanced') {
      const arrays = input.split(";").map(segment => segment.split(","));
      const thirdElements = arrays.map(arr => arr[2]).filter(Boolean);
      return thirdElements.join(" ");
    } else {
      return this.searchQuery ?? '';
    }
  }

}

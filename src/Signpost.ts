/**
 * Signpost - Extracts ORCID and other scholarly identifiers using the Signposting protocol
 * @see https://signposting.org/
 */

export interface SignpostLink {
  href: string;
  rel: string;
  type?: string;
  profile?: string;
}

export interface AuthorInfo {
  orcid?: string;
  name?: string;
  uri?: string;
}

export class Signpost {
  // private static readonly LINK_HEADER = 'Link';
  private static readonly ORCID_PATTERN = /(?:https?:\/\/)?orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])/i;
  
  /**
   * Extract author information from a webpage
   */
  static async extractAuthors(url: string): Promise<AuthorInfo[]> {
    const authors: AuthorInfo[] = [];
    
    try {
      // Fetch the page
      const response = await Zotero.HTTP.request('GET', url, {
        timeout: 30000
      });
      
      if (response.status !== 200) {
        return authors;
      }
      
      // Check Link headers for Signposting
      const linkHeader = response.getAllResponseHeaders()
        .split('\n')
        .find(h => h.toLowerCase().startsWith('link:'));
        
      if (linkHeader) {
        const signpostAuthors = this.parseSignpostingLinks(linkHeader);
        authors.push(...signpostAuthors);
      }
      
      // Also check HTML for meta tags and structured data
      const htmlAuthors = this.extractFromHTML(response.responseText);
      
      // Merge results, avoiding duplicates
      for (const htmlAuthor of htmlAuthors) {
        if (!authors.some(a => a.orcid === htmlAuthor.orcid)) {
          authors.push(htmlAuthor);
        }
      }
      
    } catch (error) {
      console.warn('Failed to extract authors:', error);
    }
    
    return authors;
  }
  
  /**
   * Parse Signposting links from Link header
   */
  private static parseSignpostingLinks(linkHeader: string): AuthorInfo[] {
    const authors: AuthorInfo[] = [];
    const links = this.parseLinkHeader(linkHeader);
    
    // Look for author links
    const authorLinks = links.filter(link => 
      link.rel === 'author' || 
      link.rel === 'http://schema.org/author' ||
      link.rel === 'https://schema.org/author'
    );
    
    for (const link of authorLinks) {
      const author: AuthorInfo = {
        uri: link.href
      };
      
      // Check if the URI is an ORCID
      const orcidMatch = link.href.match(this.ORCID_PATTERN);
      if (orcidMatch) {
        author.orcid = orcidMatch[1];
      }
      
      authors.push(author);
    }
    
    return authors;
  }
  
  /**
   * Parse Link header (simplified version)
   */
  private static parseLinkHeader(header: string): SignpostLink[] {
    const links: SignpostLink[] = [];
    const linkPattern = /<([^>]+)>([^,]*)/g;
    
    let match;
    while ((match = linkPattern.exec(header)) !== null) {
      const href = match[1];
      const params = match[2];
      
      const link: SignpostLink = {
        href,
        rel: ''
      };
      
      // Parse parameters
      const paramPattern = /(\w+)="?([^";]+)"?/g;
      let paramMatch;
      
      while ((paramMatch = paramPattern.exec(params)) !== null) {
        const key = paramMatch[1];
        const value = paramMatch[2];
        
        switch (key) {
          case 'rel':
            link.rel = value;
            break;
          case 'type':
            link.type = value;
            break;
          case 'profile':
            link.profile = value;
            break;
        }
      }
      
      if (link.rel) {
        links.push(link);
      }
    }
    
    return links;
  }
  
  /**
   * Extract author information from HTML
   */
  private static extractFromHTML(html: string): AuthorInfo[] {
    const authors: AuthorInfo[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Check meta tags
    const metaTags = doc.querySelectorAll('meta[name="author"], meta[property="author"], meta[name="DC.creator"], meta[name="citation_author"]');
    
    Array.from(metaTags).forEach(meta => {
      const content = meta.getAttribute('content');
      if (content) {
        const author: AuthorInfo = {
          name: content
        };
        
        // Check if content contains ORCID
        const orcidMatch = content.match(this.ORCID_PATTERN);
        if (orcidMatch) {
          author.orcid = orcidMatch[1];
        }
        
        authors.push(author);
      }
    });
    
    // Check for ORCID-specific meta tags
    const orcidMetas = doc.querySelectorAll('meta[name="citation_author_orcid"], meta[property="citation_author_orcid"]');
    
    Array.from(orcidMetas).forEach(meta => {
      const content = meta.getAttribute('content');
      if (content) {
        const orcidMatch = content.match(this.ORCID_PATTERN);
        if (orcidMatch) {
          authors.push({
            orcid: orcidMatch[1]
          });
        }
      }
    });
    
    // Check JSON-LD structured data
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    
    Array.from(scripts).forEach(script => {
      try {
        const data = JSON.parse(script.textContent || '');
        this.extractFromJSONLD(data, authors);
      } catch (error) {
        console.warn('Failed to parse JSON-LD:', error);
      }
    });
    
    // Remove duplicates
    const uniqueAuthors = new Map<string, AuthorInfo>();
    
    for (const author of authors) {
      const key = author.orcid || author.name || author.uri || '';
      if (key && !uniqueAuthors.has(key)) {
        uniqueAuthors.set(key, author);
      }
    }
    
    return Array.from(uniqueAuthors.values());
  }
  
  /**
   * Extract author information from JSON-LD
   */
  private static extractFromJSONLD(data: any, authors: AuthorInfo[]): void {
    if (!data) return;
    
    // Handle array of items
    if (Array.isArray(data)) {
      for (const item of data) {
        this.extractFromJSONLD(item, authors);
      }
      return;
    }
    
    // Look for author property
    if (data.author) {
      const authorData = Array.isArray(data.author) ? data.author : [data.author];
      
      for (const author of authorData) {
        const info: AuthorInfo = {};
        
        if (typeof author === 'string') {
          info.name = author;
        } else if (typeof author === 'object') {
          if (author.name) {
            info.name = author.name;
          }
          
          if (author['@id']) {
            info.uri = author['@id'];
            const orcidMatch = author['@id'].match(this.ORCID_PATTERN);
            if (orcidMatch) {
              info.orcid = orcidMatch[1];
            }
          }
          
          if (author.sameAs) {
            const sameAs = Array.isArray(author.sameAs) ? author.sameAs : [author.sameAs];
            for (const uri of sameAs) {
              const orcidMatch = uri.match(this.ORCID_PATTERN);
              if (orcidMatch) {
                info.orcid = orcidMatch[1];
                break;
              }
            }
          }
        }
        
        if (Object.keys(info).length > 0) {
          authors.push(info);
        }
      }
    }
    
    // Recursively check graph
    if (data['@graph']) {
      this.extractFromJSONLD(data['@graph'], authors);
    }
  }
  
  /**
   * Add ORCID to Zotero item
   */
  static async addORCIDToItem(item: Zotero.Item, url: string): Promise<boolean> {
    try {
      const authors = await this.extractAuthors(url);
      
      if (authors.length === 0) {
        return false;
      }
      
      // Get item creators
      const creators = item.getCreators ? item.getCreators() : [];
      let updated = false;
      
      for (const creator of creators) {
        if (creator.creatorType === 'author' && creator.lastName) {
          // Try to match author by name
          const matchingAuthor = authors.find(a => 
            a.name && this.fuzzyMatchNames(
              `${creator.firstName} ${creator.lastName}`,
              a.name
            )
          );
          
          if (matchingAuthor && matchingAuthor.orcid) {
            // Add ORCID to Extra field
            const extra = item.getField('extra') || '';
            const orcidLine = `ORCID: ${matchingAuthor.orcid}`;
            
            if (!extra.includes(orcidLine)) {
              const newExtra = extra ? `${extra}\n${orcidLine}` : orcidLine;
              item.setField('extra', newExtra);
              updated = true;
            }
          }
        }
      }
      
      if (updated) {
        await item.saveTx();
      }
      
      return updated;
    } catch (error) {
      console.error('Failed to add ORCID:', error);
      return false;
    }
  }
  
  /**
   * Fuzzy match author names
   */
  private static fuzzyMatchNames(name1: string, name2: string): boolean {
    // Normalize names
    const norm1 = name1.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const norm2 = name2.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    
    // Exact match
    if (norm1 === norm2) {
      return true;
    }
    
    // Check if one name contains the other
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      return true;
    }
    
    // Check last name match
    const parts1 = norm1.split(/\s+/);
    const parts2 = norm2.split(/\s+/);
    
    if (parts1.length > 0 && parts2.length > 0) {
      const lastName1 = parts1[parts1.length - 1];
      const lastName2 = parts2[parts2.length - 1];
      
      if (lastName1 === lastName2) {
        return true;
      }
    }
    
    return false;
  }
}
'use client';

import { forwardRef } from 'react';

export interface ProposalSection {
  id: string;
  title: string;
  content: string;
  imagePrompt?: string;
  imageUrl?: string;
}

interface ProposalPDFProps {
  tenderTitle: string;
  organization?: string;
  companyName?: string;
  sections: ProposalSection[];
  budget?: number;
  deadline?: string;
}

// Convert markdown to HTML for PDF
function renderContent(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gm, '<h4 style="font-size: 14px; font-weight: 600; margin: 16px 0 8px 0; color: #1f2937;">$1</h4>')
    .replace(/^## (.*$)/gm, '<h3 style="font-size: 16px; font-weight: 600; margin: 20px 0 10px 0; color: #1f2937;">$1</h3>')
    .replace(/^# (.*$)/gm, '<h2 style="font-size: 18px; font-weight: 700; margin: 24px 0 12px 0; color: #111827;">$1</h2>')
    .replace(/^- (.*$)/gm, '<li style="margin-left: 20px; margin-bottom: 4px;">$1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li style="margin-left: 20px; margin-bottom: 4px; list-style-type: decimal;">$1</li>')
    .replace(/\n\n/g, '</p><p style="margin-bottom: 12px; line-height: 1.6;">')
    .replace(/\n/g, '<br/>');
}

const ProposalPDF = forwardRef<HTMLDivElement, ProposalPDFProps>(
  ({ tenderTitle, organization, companyName, sections, budget, deadline }, ref) => {
    // Primary brand color
    const primaryColor = '#0f766e'; // teal-700
    const primaryLight = '#ccfbf1'; // teal-100
    
    return (
      <div 
        ref={ref}
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '20mm 20mm',
          backgroundColor: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '12px',
          lineHeight: '1.6',
          color: '#374151',
          boxSizing: 'border-box',
        }}
      >
        {/* Cover Page */}
        <div style={{ 
          pageBreakAfter: 'always',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '257mm', // Full page minus padding
          textAlign: 'center',
        }}>
          {/* Logo placeholder */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: primaryColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '40px',
          }}>
            <span style={{ color: 'white', fontSize: '32px', fontWeight: 'bold' }}>
              {companyName?.charAt(0) || 'B'}
            </span>
          </div>
          
          <h1 style={{
            fontSize: '28px',
            fontWeight: '800',
            color: '#111827',
            marginBottom: '16px',
            maxWidth: '500px',
            lineHeight: '1.3',
          }}>
            {tenderTitle}
          </h1>
          
          <div style={{
            width: '60px',
            height: '4px',
            backgroundColor: primaryColor,
            margin: '20px 0',
            borderRadius: '2px',
          }} />
          
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            marginBottom: '8px',
          }}>
            Proposal submitted to
          </p>
          <p style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '40px',
          }}>
            {organization || 'Procuring Entity'}
          </p>
          
          <div style={{
            padding: '20px 40px',
            backgroundColor: primaryLight,
            borderRadius: '12px',
            marginBottom: '40px',
          }}>
            <p style={{
              fontSize: '14px',
              color: primaryColor,
              fontWeight: '600',
              marginBottom: '4px',
            }}>
              Submitted by
            </p>
            <p style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#111827',
            }}>
              {companyName || 'Your Company'}
            </p>
          </div>
          
          {budget && budget > 0 && (
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
            }}>
              Budget: <strong style={{ color: '#111827' }}>₦{budget.toLocaleString()}</strong>
            </p>
          )}
          
          <p style={{
            fontSize: '12px',
            color: '#9ca3af',
            marginTop: '60px',
          }}>
            {new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Table of Contents */}
        <div style={{ pageBreakAfter: 'always' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '30px',
            paddingBottom: '10px',
            borderBottom: `3px solid ${primaryColor}`,
          }}>
            Table of Contents
          </h2>
          
          <div style={{ marginTop: '20px' }}>
            {sections.map((section, index) => (
              <div 
                key={section.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <span style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  backgroundColor: primaryLight,
                  color: primaryColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  fontSize: '12px',
                  marginRight: '16px',
                  flexShrink: 0,
                }}>
                  {index + 1}
                </span>
                <span style={{
                  flex: 1,
                  fontSize: '14px',
                  color: '#374151',
                }}>
                  {section.title}
                </span>
                <span style={{
                  fontSize: '12px',
                  color: '#9ca3af',
                }}>
                  Page {index + 3}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sections */}
        {sections.map((section, index) => (
          <div 
            key={section.id}
            style={{ 
              pageBreakBefore: index > 0 ? 'always' : 'auto',
              marginBottom: '40px',
            }}
          >
            {/* Section Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: `2px solid ${primaryLight}`,
            }}>
              <span style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: primaryColor,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '16px',
                marginRight: '16px',
                flexShrink: 0,
              }}>
                {index + 1}
              </span>
              <h2 style={{
                fontSize: '22px',
                fontWeight: '700',
                color: '#111827',
                margin: 0,
              }}>
                {section.title}
              </h2>
            </div>

            {/* Section Image */}
            {section.imageUrl && (
              <div style={{
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <img 
                  src={section.imageUrl}
                  alt={section.title}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '200px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                  crossOrigin="anonymous"
                />
              </div>
            )}

            {/* Section Content */}
            <div 
              style={{
                fontSize: '12px',
                lineHeight: '1.7',
                color: '#374151',
              }}
              dangerouslySetInnerHTML={{ __html: renderContent(section.content) }}
            />
          </div>
        ))}

        {/* Footer on each page - Note: html2pdf doesn't support running headers/footers well */}
        <div style={{
          position: 'fixed',
          bottom: '10mm',
          left: '20mm',
          right: '20mm',
          borderTop: '1px solid #e5e7eb',
          paddingTop: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          color: '#9ca3af',
        }}>
          <span>{companyName || 'Company'}</span>
          <span>Proposal for {organization || 'Procuring Entity'}</span>
        </div>
      </div>
    );
  }
);

ProposalPDF.displayName = 'ProposalPDF';

export default ProposalPDF;

/**
 * IOC Enrichment Page
 * Página para enriquecer IOCs usando LLM e visualizar threat intelligence
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Psychology,
  BugReport,
  Shield,
  TrendingUp,
  Security,
} from '@mui/icons-material';
import iocEnrichmentService, { EnrichedIOC, EnrichFromFeedResponse } from '../../services/cti/iocEnrichmentService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const IOCEnrichmentPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedFeed, setSelectedFeed] = useState<string>('');
  const [limit, setLimit] = useState<number>(3);
  const [loading, setLoading] = useState(false);
  const [enrichResult, setEnrichResult] = useState<EnrichFromFeedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableFeeds = [
    { id: 'diamondfox_c2', name: 'DiamondFox C2 Panels (Unit42)' },
    { id: 'sslbl', name: 'abuse.ch SSL Blacklist' },
    { id: 'openphish', name: 'OpenPhish' },
    { id: 'serpro', name: 'SERPRO (BR Gov)' },
    { id: 'urlhaus', name: 'URLhaus' },
    { id: 'threatfox', name: 'ThreatFox' },
    { id: 'emerging_threats', name: 'Emerging Threats' },
    { id: 'alienvault_reputation', name: 'AlienVault Reputation' },
    { id: 'blocklist_de', name: 'blocklist.de' },
    { id: 'greensnow', name: 'GreenSnow' },
    { id: 'cins_badguys', name: 'CINS Score Bad Guys' },
  ];

  const handleEnrichFromFeed = async () => {
    if (!selectedFeed) {
      setError('Selecione um feed');
      return;
    }

    setLoading(true);
    setError(null);
    setEnrichResult(null);

    try {
      const result = await iocEnrichmentService.enrichFromFeed({
        feed_type: selectedFeed,
        limit: limit,
      });
      setEnrichResult(result);
    } catch (err: any) {
      setError(`Erro ao enriquecer IOCs: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string): "default" | "error" | "warning" | "info" | "success" => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const getThreatTypeColor = (threatType: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (threatType) {
      case 'c2':
        return 'error';
      case 'phishing':
        return 'warning';
      case 'malware_delivery':
        return 'error';
      case 'data_exfiltration':
        return 'error';
      case 'reconnaissance':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Psychology /> IOC Enrichment com LLM
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Enriqueça IOCs com contexto de threat intelligence usando LLM e MITRE ATT&CK
      </Typography>

      <Paper sx={{ mt: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Enriquecer de Feed" icon={<BugReport />} iconPosition="start" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Selecione um Feed</InputLabel>
                  <Select
                    value={selectedFeed}
                    onChange={(e) => setSelectedFeed(e.target.value)}
                    label="Selecione um Feed"
                  >
                    {availableFeeds.map((feed) => (
                      <MenuItem key={feed.id} value={feed.id}>
                        {feed.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Limite</InputLabel>
                  <Select
                    value={limit}
                    onChange={(e) => setLimit(e.target.value as number)}
                    label="Limite"
                  >
                    <MenuItem value={1}>1 IOC</MenuItem>
                    <MenuItem value={3}>3 IOCs</MenuItem>
                    <MenuItem value={5}>5 IOCs</MenuItem>
                    <MenuItem value={10}>10 IOCs</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleEnrichFromFeed}
                  disabled={loading || !selectedFeed}
                  startIcon={loading ? <CircularProgress size={20} /> : <Psychology />}
                >
                  {loading ? 'Enriquecendo...' : 'Enriquecer'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {enrichResult && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Resultado do Enrichment
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Feed
                  </Typography>
                  <Typography variant="h6">{enrichResult.feed_name}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    IOCs Fetched
                  </Typography>
                  <Typography variant="h6">{enrichResult.iocs_fetched}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    IOCs Enriquecidos
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {enrichResult.iocs_enriched}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Status
                  </Typography>
                  <Chip label={enrichResult.status} color="success" size="small" />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            IOCs Enriquecidos
          </Typography>

          <List>
            {enrichResult.enriched_iocs.map((enrichedIOC: EnrichedIOC, index: number) => (
              <ListItem
                key={index}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 2,
                  flexDirection: 'column',
                  alignItems: 'stretch',
                }}
              >
                {/* IOC Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <BugReport fontSize="small" />
                  <Typography variant="body1" sx={{ fontFamily: 'monospace', flex: 1 }}>
                    {enrichedIOC.value.substring(0, 80)}
                    {enrichedIOC.value.length > 80 ? '...' : ''}
                  </Typography>
                  <Chip label={enrichedIOC.type} size="small" color="primary" />
                </Box>

                {/* Enrichment Data */}
                <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
                  <Grid container spacing={2}>
                    {/* Threat Type & Severity */}
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Threat Type
                      </Typography>
                      <Chip
                        label={enrichedIOC.enrichment.threat_type}
                        size="small"
                        color={getThreatTypeColor(enrichedIOC.enrichment.threat_type)}
                        sx={{ mt: 0.5 }}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Severity
                      </Typography>
                      <Chip
                        icon={<Shield />}
                        label={enrichedIOC.enrichment.severity.toUpperCase()}
                        size="small"
                        color={getSeverityColor(enrichedIOC.enrichment.severity)}
                        sx={{ mt: 0.5 }}
                      />
                    </Grid>

                    {/* Summary */}
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Summary
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {enrichedIOC.enrichment.summary}
                      </Typography>
                    </Grid>

                    {/* MITRE ATT&CK Techniques */}
                    {enrichedIOC.enrichment.techniques && enrichedIOC.enrichment.techniques.length > 0 && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Security fontSize="small" /> MITRE ATT&CK Techniques
                        </Typography>
                        <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {enrichedIOC.enrichment.techniques.map((tech, i) => (
                            <Chip
                              key={i}
                              label={tech}
                              size="small"
                              variant="outlined"
                              color="error"
                            />
                          ))}
                        </Box>
                      </Grid>
                    )}

                    {/* Tactics */}
                    {enrichedIOC.enrichment.tactics && enrichedIOC.enrichment.tactics.length > 0 && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Tactics
                        </Typography>
                        <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {enrichedIOC.enrichment.tactics.map((tactic, i) => (
                            <Chip key={i} label={tactic} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </Grid>
                    )}

                    {/* Detection Methods */}
                    {enrichedIOC.enrichment.detection_methods && enrichedIOC.enrichment.detection_methods.length > 0 && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Detection Methods
                        </Typography>
                        <List dense sx={{ mt: 0.5 }}>
                          {enrichedIOC.enrichment.detection_methods.map((method, i) => (
                            <ListItem key={i} sx={{ py: 0.5 }}>
                              <ListItemText
                                primary={`${i + 1}. ${method}`}
                                primaryTypographyProps={{ variant: 'body2' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Grid>
                    )}

                    {/* Footer */}
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Chip
                          label={`Confidence: ${enrichedIOC.enrichment.confidence}`}
                          size="small"
                          variant="outlined"
                        />
                        {enrichedIOC.enrichment.llm_used && (
                          <Chip
                            icon={<Psychology fontSize="small" />}
                            label={enrichedIOC.enrichment.llm_used}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default IOCEnrichmentPage;

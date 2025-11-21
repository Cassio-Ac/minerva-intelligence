/**
 * MISP Feeds Page
 * Página para testar e visualizar feeds MISP de threat intelligence
 */

import React, { useState, useEffect } from 'react';
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
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  CloudDownload,
  BugReport,
  Shield,
  Language,
  Storage,
} from '@mui/icons-material';
import mispFeedsService, { FeedTestResult, AvailableFeed, MISPIoC } from '../../services/cti/mispFeedsService';

const MISPFeedsPage: React.FC = () => {
  const [availableFeeds, setAvailableFeeds] = useState<AvailableFeed[]>([]);
  const [selectedFeed, setSelectedFeed] = useState<string>('');
  const [limit, setLimit] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<FeedTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAvailableFeeds();
  }, []);

  const loadAvailableFeeds = async () => {
    try {
      const feeds = await mispFeedsService.listAvailableFeeds();
      setAvailableFeeds(feeds);
    } catch (err: any) {
      setError(`Erro ao carregar feeds: ${err.message}`);
    }
  };

  const handleTestFeed = async () => {
    if (!selectedFeed) {
      setError('Selecione um feed');
      return;
    }

    setLoading(true);
    setError(null);
    setTestResult(null);

    try {
      const result = await mispFeedsService.testFeed(selectedFeed, limit);
      setTestResult(result);
    } catch (err: any) {
      setError(`Erro ao testar feed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ip':
        return <Language fontSize="small" />;
      case 'url':
        return <Language fontSize="small" />;
      case 'hash':
        return <Storage fontSize="small" />;
      default:
        return <BugReport fontSize="small" />;
    }
  };

  const getTypeColor = (type: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (type) {
      case 'ip':
        return 'primary';
      case 'url':
        return 'secondary';
      case 'hash':
        return 'info';
      case 'domain':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Shield /> MISP Threat Intelligence Feeds
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Teste e visualize feeds públicos de threat intelligence (IOCs)
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <FormControl fullWidth>
              <InputLabel>Selecione um Feed</InputLabel>
              <Select
                value={selectedFeed}
                onChange={(e) => setSelectedFeed(e.target.value)}
                label="Selecione um Feed"
              >
                {availableFeeds.map((feed) => (
                  <MenuItem key={feed.id} value={feed.id}>
                    {feed.name} ({feed.type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="number"
              label="Limite de IOCs"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 5)}
              inputProps={{ min: 1, max: 50 }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleTestFeed}
              disabled={loading || !selectedFeed}
              startIcon={loading ? <CircularProgress size={20} /> : <CloudDownload />}
            >
              {loading ? 'Testando...' : 'Testar Feed'}
            </Button>
          </Grid>
        </Grid>

        {selectedFeed && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {availableFeeds.find(f => f.id === selectedFeed)?.description}
            </Typography>
          </Box>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {testResult && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Resultado do Teste
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Feed
                  </Typography>
                  <Typography variant="h6">{testResult.feed_name}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Itens Processados
                  </Typography>
                  <Typography variant="h6">{testResult.items_processed}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    IOCs Encontrados
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {testResult.iocs_found}
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
                  <Chip
                    label={testResult.status}
                    color="success"
                    size="small"
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Samples de IOCs
          </Typography>

          <List>
            {testResult.sample.map((ioc: MISPIoC, index: number) => (
              <ListItem
                key={index}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      {getTypeIcon(ioc.type)}
                      <Typography variant="body1" component="span" sx={{ fontFamily: 'monospace' }}>
                        {ioc.value}
                      </Typography>
                      <Chip
                        label={ioc.type}
                        size="small"
                        color={getTypeColor(ioc.type)}
                      />
                      {ioc.malware_family && (
                        <Chip
                          label={`Malware: ${ioc.malware_family}`}
                          size="small"
                          color="error"
                        />
                      )}
                      {ioc.confidence && (
                        <Chip
                          label={`Confidence: ${ioc.confidence}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {ioc.context}
                      </Typography>
                      {ioc.tags && ioc.tags.length > 0 && (
                        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {ioc.tags.map((tag, i) => (
                            <Chip key={i} label={tag} size="small" variant="outlined" />
                          ))}
                        </Box>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Feed URL: {testResult.feed_url}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default MISPFeedsPage;

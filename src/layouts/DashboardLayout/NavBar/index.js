import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  Box,
  Drawer,
  List,
  makeStyles
} from '@material-ui/core';
import MultilineChartIcon from '@material-ui/icons/MultilineChart';
import DashboardIcon from '@material-ui/icons/Dashboard';
import EqualizerIcon from '@material-ui/icons/Equalizer';
import ShuffleIcon from '@material-ui/icons/Shuffle';
import BlurOffIcon from '@material-ui/icons/BlurOff';
import { links } from 'src/utils/navigation-urls';
import NavItem from './NavItem';

const items = [
  {
    href: links.dashboard.absolute,
    icon: DashboardIcon,
    title: 'Dashboard'
  },
  {
    href: links.totals.absolute,
    icon: MultilineChartIcon,
    title: 'Cumulative Totals'
  },
  {
    href: links.distribution.absolute,
    icon: EqualizerIcon,
    title: 'Distribution'
  },
  {
    href: links.correlation.absolute,
    icon: ShuffleIcon,
    title: 'Correlation'
  },
  {
    href: links.regression.absolute,
    icon: BlurOffIcon,
    title: 'Regression'
  }
];

const useStyles = makeStyles(() => ({
  mobileDrawer: {
    width: 256
  }
}));

const NavBar = ({ onMobileClose, openMobile }) => {
  const classes = useStyles();
  const location = useLocation();

  useEffect(() => {
    if (openMobile && onMobileClose) {
      onMobileClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const content = (
    <Box
      height="100%"
      display="flex"
      flexDirection="column"
    >
      <Box p={2}>
        <List>
          {items.map((item) => (
            <NavItem
              href={item.href}
              key={item.title}
              title={item.title}
              icon={item.icon}
            />
          ))}
        </List>
      </Box>
      <Box flexGrow={1} />
    </Box>
  );

  return (
    <>
      <Drawer
        anchor="left"
        classes={{ paper: classes.mobileDrawer }}
        onClose={onMobileClose}
        open={openMobile}
        variant="temporary"
      >
        {content}
      </Drawer>
    </>
  );
};

NavBar.propTypes = {
  onMobileClose: PropTypes.func,
  openMobile: PropTypes.bool
};

NavBar.defaultProps = {
  onMobileClose: () => {},
  openMobile: false
};

export default NavBar;
